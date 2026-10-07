import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalJson,
  deterministicSubscriptionId,
  validateSigningSecret,
  validatePublicCallbackUrl,
  InMemorySubscriptionStore,
  OpenAIMcpEventService
} from '../src/openai/events-runtime.mjs';
import {
  buildOmegaUiMetadata,
  buildOmegaForm,
  buildMentionItems,
  buildOmegaAppHtml
} from '../src/openai/extensions-ui.mjs';
import { BlobSubscriptionStore } from '../src/openai/blob-subscription-store.mjs';

test('canonicalJson and deterministic subscription id ignore object key order', () => {
  assert.equal(canonicalJson({ b: 2, a: { d: 4, c: 3 } }), '{"a":{"c":3,"d":4},"b":2}');
  const a = deterministicSubscriptionId({ subject: 'user-1', url: 'https://example.com/cb', name: 'omega.run.completed', arguments: { repo: 'x', branch: 'main' } });
  const b = deterministicSubscriptionId({ subject: 'user-1', url: 'https://example.com/cb', name: 'omega.run.completed', arguments: { branch: 'main', repo: 'x' } });
  assert.equal(a, b);
  assert.match(a, /^sub_[0-9a-f]{48}$/);
});

test('signing secret must be whsec_ base64 decoding to 24-64 bytes', () => {
  const valid = 'whsec_' + Buffer.alloc(32, 7).toString('base64');
  assert.equal(validateSigningSecret(valid), valid);
  assert.throws(() => validateSigningSecret('secret'), /whsec_/);
  assert.throws(() => validateSigningSecret('whsec_' + Buffer.alloc(4).toString('base64')), /24-64/);
});

test('callback URL validation requires https and rejects private DNS answers', async () => {
  await assert.rejects(() => validatePublicCallbackUrl('http://example.com/cb', { resolveHost: async () => ['93.184.216.34'] }), /HTTPS/);
  await assert.rejects(() => validatePublicCallbackUrl('https://localhost/cb', { resolveHost: async () => ['127.0.0.1'] }), /public/);
  await assert.rejects(() => validatePublicCallbackUrl('https://callback.example/cb', { resolveHost: async () => ['10.0.0.2'] }), /public/);
  const out = await validatePublicCallbackUrl('https://callback.example/cb', { resolveHost: async () => ['93.184.216.34'] });
  assert.equal(out.hostname, 'callback.example');
});

test('subscribe verifies callback, persists state, and refresh is idempotent', async () => {
  const store = new InMemorySubscriptionStore();
  const requests = [];
  const service = new OpenAIMcpEventService({
    store,
    resolveHost: async () => ['93.184.216.34'],
    fetchImpl: async (url, init) => {
      requests.push({ url, init });
      const payload = JSON.parse(init.body);
      return new Response(JSON.stringify({ challenge: payload.challenge }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
    now: () => new Date('2026-10-07T10:00:00Z'),
    randomId: () => 'challenge-fixed'
  });
  const secret = 'whsec_' + Buffer.alloc(32, 9).toString('base64');
  const first = await service.subscribe({ subject: 'user-1', name: 'omega.run.completed', arguments: { repo: 'r' }, delivery: { mode: 'webhook', url: 'https://callback.example/hook', secret }, ttlMs: 60000 });
  const second = await service.subscribe({ subject: 'user-1', name: 'omega.run.completed', arguments: { repo: 'r' }, delivery: { mode: 'webhook', url: 'https://callback.example/hook', secret }, ttlMs: 120000 });
  assert.equal(first.id, second.id);
  assert.equal((await store.list()).length, 1);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.redirect, 'error');
  assert.match(requests[0].init.headers['webhook-signature'], /^v1,/);
});

test('unsubscribe is idempotent', async () => {
  const service = new OpenAIMcpEventService({ store: new InMemorySubscriptionStore(), resolveHost: async () => ['93.184.216.34'], fetchImpl: async () => new Response('{}', { status: 200 }) });
  await service.unsubscribe({ subject: 'user-1', name: 'omega.run.completed', arguments: {}, delivery: { mode: 'webhook', url: 'https://callback.example/hook' } });
  await service.unsubscribe({ subject: 'user-1', name: 'omega.run.completed', arguments: {}, delivery: { mode: 'webhook', url: 'https://callback.example/hook' } });
  assert.equal((await service.store.list()).length, 0);
});

test('emit delivers one signed event with stable event id and subscription header', async () => {
  const store = new InMemorySubscriptionStore();
  const sent = [];
  const service = new OpenAIMcpEventService({
    store,
    resolveHost: async () => ['93.184.216.34'],
    fetchImpl: async (url, init) => {
      const body = JSON.parse(init.body);
      if (body.type === 'verification') return new Response(JSON.stringify({ challenge: body.challenge }), { status: 200, headers: { 'content-type': 'application/json' } });
      sent.push({ url, init, body });
      return new Response('', { status: 202 });
    },
    randomId: () => 'evt-fixed'
  });
  const secret = 'whsec_' + Buffer.alloc(32, 3).toString('base64');
  const sub = await service.subscribe({ subject: 'u', name: 'omega.artifact.created', arguments: { project: 'p' }, delivery: { mode: 'webhook', url: 'https://callback.example/hook', secret } });
  const out = await service.emit({ name: 'omega.artifact.created', data: { project: 'p', artifactId: 'a1' } });
  assert.equal(out.delivered, 1);
  assert.equal(sent[0].body.eventId, 'evt-fixed');
  assert.equal(sent[0].init.headers['webhook-id'], 'evt-fixed');
  assert.equal(sent[0].init.headers['X-MCP-Subscription-Id'], sub.id);
  assert.match(sent[0].init.headers['webhook-signature'], /^v1,/);
});

test('UI metadata exposes global, thread, settings and desktop file entrypoints', () => {
  const metadata = buildOmegaUiMetadata();
  assert.deepEqual(metadata['openai/ui'].entrypoints.map(x => x.type), ['global', 'thread', 'settings', 'file']);
  const file = metadata['openai/ui'].entrypoints.find(x => x.type === 'file');
  assert.deepEqual(file.extensions, ['.md', '.txt', '.json', '.yaml', '.yml']);
  assert.equal(metadata.ui.resourceUri, 'ui://omega/control-center');
});

test('rich form and mention results are structured and bounded', () => {
  const form = buildOmegaForm([{ id: 'safe', title: 'Safe mode', description: 'Require approvals' }]);
  assert.equal(form.type, 'object');
  assert.equal(form.properties.mode.oneOf[0].const, 'safe');
  const mentions = buildMentionItems([{ uri: 'omega://capability/wda', name: 'WDA Ω∞', description: 'Visual control plane' }], 'wda');
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0].type, 'resource_link');
  assert.equal(mentions[0].uri, 'omega://capability/wda');
});

test('app HTML wires model context, deep links and file resource read/write behavior', () => {
  const html = buildOmegaAppHtml();
  assert.match(html, /modelContext\.update/);
  assert.match(html, /deepLink\.getCurrent/);
  assert.match(html, /resources\?\.read/);
  assert.match(html, /resources\?\.write/);
  assert.match(html, /hostcontextchanged/);
});

test('BlobSubscriptionStore uses private consistent reads and overwrite-safe writes', async () => {
  const calls=[];
  const blobs=new Map();
  const api={
    async put(path, body, options){calls.push(['put',path,options]); blobs.set(path,String(body)); return {pathname:path};},
    async get(path, options){calls.push(['get',path,options]); if(!blobs.has(path)) return null; return {statusCode:200,stream:new Blob([blobs.get(path)]).stream(),blob:{pathname:path}};},
    async del(path, options){calls.push(['del',path,options]); blobs.delete(path);},
    async list({prefix}){calls.push(['list',prefix]); return {blobs:[...blobs.keys()].filter(x=>x.startsWith(prefix)).map(pathname=>({pathname}))};}
  };
  const store=new BlobSubscriptionStore({blobApi:api,prefix:'test/subs/'});
  await store.put({id:'sub_a',name:'omega.run.completed',active:true});
  const read=await store.get('sub_a');
  assert.equal(read.id,'sub_a');
  assert.equal(calls.find(x=>x[0]==='get')[2].access,'private');
  assert.equal(calls.find(x=>x[0]==='get')[2].useCache,false);
  assert.equal(calls.find(x=>x[0]==='put')[2].allowOverwrite,true);
  assert.equal((await store.list()).length,1);
  await store.delete('sub_a');
  assert.equal(await store.get('sub_a'),null);
});
