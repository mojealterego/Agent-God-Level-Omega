import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountTunnelBroker } from '../src/asgard/account-tunnel-broker.mjs';

test('registers many isolated accounts without exposing secret values',()=>{
 const b=new AccountTunnelBroker({env:{GEMINI_1:'secret-value-one'}});
 b.register({id:'gem-1',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,secretEnvRef:'GEMINI_1',capabilities:['research']});
 b.register({id:'gem-2',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,secretEnvRef:'GEMINI_2',capabilities:['research']});
 const list=b.list({provider:'GEMINI'}); assert.equal(list.length,2); assert.equal(JSON.stringify(list).includes('secret-value-one'),false);
 assert.deepEqual(b.authDescriptor('gem-1'),{transport:'ENV_API_KEY',secretEnvRef:'GEMINI_1',secretAvailable:true,profileRef:null,connectorRef:null,rawSecretReturned:false});
});

test('rejects raw secret fields',()=>{ const b=new AccountTunnelBroker(); assert.throws(()=>b.register({id:'x',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,apiKey:'abc123secret'}),/raw secret/i); });

test('routes by health priority and concurrency',()=>{
 const b=new AccountTunnelBroker();
 b.register({id:'a',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,priority:50,maxConcurrency:1,health:'HEALTHY'});
 b.register({id:'b',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,priority:40,maxConcurrency:2,health:'HEALTHY'});
 const x=b.acquire({provider:'GEMINI'}); assert.equal(x.account.id,'a'); const y=b.acquire({provider:'GEMINI'}); assert.equal(y.account.id,'b'); b.release(x.session.sessionId,{ok:true});
});

test('affinity keeps a project on the same account when eligible',()=>{
 const b=new AccountTunnelBroker();
 b.register({id:'a',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,priority:10,maxConcurrency:2,health:'HEALTHY'});
 b.register({id:'b',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,priority:100,maxConcurrency:2,health:'HEALTHY'});
 const first=b.route({provider:'GEMINI',affinityKey:'p1'}); const second=b.route({provider:'GEMINI',affinityKey:'p1'}); assert.equal(first.selected.id,second.selected.id);
});

test('github account produces isolated env patch',()=>{
 const b=new AccountTunnelBroker({env:{GH_ALT_TOKEN:'tok-secret'}});
 b.register({id:'gh-1',provider:'GITHUB',transport:'GH_CONFIG_DIR',authorized:true,profileRef:'/tmp/gh1'});
 b.register({id:'gh-2',provider:'GITHUB',transport:'ENV_TOKEN',authorized:true,secretEnvRef:'GH_ALT_TOKEN'});
 assert.deepEqual(b.envPatch('gh-1'),{GH_CONFIG_DIR:'/tmp/gh1'}); assert.deepEqual(b.envPatch('gh-2'),{GH_TOKEN:'tok-secret'});
});

test('host ChatGPT profiles are routable metadata but not silently authenticated',()=>{
 const b=new AccountTunnelBroker(); b.register({id:'chat-1',provider:'CHATGPT',transport:'HOST_PROFILE',authorized:true,profileRef:'primary'}); const r=b.route({provider:'CHATGPT'}); assert.equal(r.selected.id,'chat-1'); assert.equal(b.authDescriptor('chat-1').secretAvailable,false);
});


test('bootstraps seven Gemini account slots with independent env refs',()=>{
 const env={GEMINI_API_KEY_1:'k1',GEMINI_API_KEY_7:'k7'}; const b=new AccountTunnelBroker({env});
 const out=b.bootstrap({provider:'GEMINI',count:7,secretEnvPrefix:'GEMINI_API_KEY_',capabilities:['research']});
 assert.equal(out.count,7); assert.equal(out.created[0].authorized,true); assert.equal(out.created[1].authorized,false); assert.equal(out.created[6].authorized,true);
 assert.equal(out.created[6].secretEnvRef,'GEMINI_API_KEY_7');
});
