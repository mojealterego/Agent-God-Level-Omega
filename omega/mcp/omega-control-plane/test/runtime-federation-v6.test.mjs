import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalProcessCognitiveProvider } from '../src/cognitive/local-process-provider.mjs';
import { ExternalProviderRegistry } from '../src/cognitive/external-provider-registry.mjs';
import { RemoteMcpFederation } from '../src/cognitive/remote-mcp-federation.mjs';
import { imandraCodeLogicianPreset } from '../src/cognitive/imandra-provider.mjs';
import { builtinRuntimePreset } from '../src/cognitive/runtime-presets.mjs';

async function tempRoot() { return await mkdtemp(join(tmpdir(), 'omega-v6-')); }

test('local process cognitive provider keeps a JSONL sidecar alive across invocations and exposes health', async () => {
  const root = await tempRoot();
  const fixture = join(root, 'provider.mjs');
  await writeFile(fixture, `
    import readline from 'node:readline';
    let count = 0;
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) {
      const req = JSON.parse(line); count += 1;
      const result = req.operation === 'health' ? { ready: true, count } : { echoed: req.payload, count };
      process.stdout.write(JSON.stringify({ id: req.id, ok: true, result }) + '\\n');
    }
  `);
  const provider = new LocalProcessCognitiveProvider({
    id: 'local', command: process.execPath, args: [fixture], cwd: root,
    capabilities: ['echo'], timeoutMs: 2000
  });
  const health = await provider.health();
  assert.equal(health.ready, true);
  const a = await provider.invoke('echo', { n: 1 });
  const b = await provider.invoke('echo', { n: 2 });
  assert.equal(a.count + 1, b.count);
  assert.deepEqual(b.echoed, { n: 2 });
  await provider.close();
});

test('local process provider rejects unsupported operations and does not persist secret values', async () => {
  const provider = new LocalProcessCognitiveProvider({
    id: 'x', command: process.execPath, args: ['noop'], cwd: process.cwd(),
    capabilities: ['allowed'], envMap: { API_KEY: 'OMEGA_TEST_SECRET' }
  });
  await assert.rejects(() => provider.invoke('denied', {}), /does not advertise capability/i);
  const descriptor = provider.descriptor();
  assert.deepEqual(descriptor.envMap, { API_KEY: 'OMEGA_TEST_SECRET' });
  assert.equal(JSON.stringify(descriptor).includes(process.env.OMEGA_TEST_SECRET ?? 'never-value'), false);
});

test('external provider registry supports persistent process providers', async () => {
  const root = await tempRoot();
  const fixture = join(root, 'provider.mjs');
  await writeFile(fixture, `
    import readline from 'node:readline';
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) { const req = JSON.parse(line); process.stdout.write(JSON.stringify({ id:req.id, ok:true, result:{ operation:req.operation, payload:req.payload } })+'\\n'); }
  `);
  const registry = new ExternalProviderRegistry({ filePath: join(root, 'providers.json') });
  await registry.register({ id: 'proc', providerType: 'generic', kind: 'process', command: process.execPath, args: [fixture], cwd: root, capabilities: ['compute'] });
  const out = await registry.invoke('proc', 'compute', { x: 7 });
  assert.equal(out.operation, 'compute');
  const health = await registry.health('proc');
  assert.equal(health.ready, true);
  const registry2 = new ExternalProviderRegistry({ filePath: join(root, 'providers.json') });
  const listed = await registry2.list();
  assert.equal(listed[0].kind, 'process');
  assert.equal(listed[0].command, process.execPath);
  await registry.close();
  await registry2.close();
});

test('remote MCP federation supports bearer-env auth metadata and health discovery without persisting token values', async () => {
  const root = await tempRoot();
  const seen = [];
  const federation = new RemoteMcpFederation({
    filePath: join(root, 'federation.json'),
    env: { IMANDRA_API_KEY: 'secret-value' },
    clientFactory: async (cfg) => {
      seen.push(cfg);
      return {
        async listTools() { return { tools: [{ name: 'formalize' }, { name: 'verify' }] }; },
        async callTool(input) { return { structuredContent: input }; },
        async close() {},
        protocolEra: () => 'modern',
        serverVersion: () => ({ name: 'fake', version: '1.0.0' })
      };
    }
  });
  await federation.register({ id: 'imandra', endpoint: 'https://api.imandra.ai/v1beta1/tools/mcp/code_logician', auth: { type: 'bearer-env', env: 'IMANDRA_API_KEY' }, capabilities: ['formal'] });
  const health = await federation.health('imandra');
  assert.equal(health.ok, true);
  assert.equal(health.toolCount, 2);
  assert.equal(seen[0].auth.type, 'bearer');
  assert.equal(seen[0].auth.token, 'secret-value');
  const serialized = JSON.stringify(await federation.exportConfig());
  assert.equal(serialized.includes('secret-value'), false);
  assert.equal(serialized.includes('IMANDRA_API_KEY'), true);
});

test('Imandra preset uses the real CodeLogician Streamable HTTP endpoint and env-backed bearer auth', () => {
  const preset = imandraCodeLogicianPreset();
  assert.equal(preset.endpoint, 'https://api.imandra.ai/v1beta1/tools/mcp/code_logician');
  assert.deepEqual(preset.auth, { type: 'bearer-env', env: 'IMANDRA_API_KEY' });
  assert.equal(preset.capabilities.includes('formal'), true);
});

test('builtin runtime presets bind JEPA, Titans and R3Mem to concrete auto/fallback sidecars' , () => {
  const root = process.cwd();
  const jepa = builtinRuntimePreset('jepa', { packageRoot: root, python: 'python3' });
  const titans = builtinRuntimePreset('titans', { packageRoot: root, python: 'python3' });
  const r3 = builtinRuntimePreset('r3mem', { packageRoot: root, python: 'python3' });
  assert.equal(jepa.kind, 'process');
  assert.equal(jepa.args.at(-1).endsWith('runtime/jepa_auto_provider.py'), true);
  assert.equal(jepa.capabilities.includes('jepa.embed'), true);
  assert.equal(titans.args.at(-1).endsWith('runtime/titans_auto_provider.py'), true);
  assert.equal(titans.capabilities.includes('titans.memorize'), true);
  assert.equal(r3.args.at(-1).endsWith('runtime/r3mem_provider.py'), true);
  assert.equal(r3.metadata.requiresExternalImplementation, false);
});

import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes MCP federation health/export and configures Imandra from the verified preset', async () => {
  const root = await tempRoot();
  const fakeFactory = async ({ endpoint, auth }) => ({
    listTools: async () => ({ tools: [{ name: 'reason_about_code' }] }),
    callTool: async ({ name, arguments: args }) => ({ content: [{ type: 'text', text: JSON.stringify({ name, args }) }] }),
    close: async () => {},
    protocolEra: () => '2026',
    serverVersion: () => ({ name: 'fake-code-logician', version: '1' })
  });
  const plane = new OmegaControlPlane({
    workspaceRoots: [root],
    mcpClientFactory: fakeFactory,
    env: { IMANDRA_API_KEY: 'secret-value' }
  });

  const configured = await plane.imandra({ cwd: root, action: 'configure' });
  assert.equal(configured, 'imandra');
  const exported = await plane.mcpFederation({ cwd: root, action: 'export' });
  assert.equal(exported.providers[0].endpoint, 'https://api.imandra.ai/v1beta1/tools/mcp/code_logician');
  assert.deepEqual(exported.providers[0].auth, { type: 'bearer-env', env: 'IMANDRA_API_KEY' });
  assert.equal(JSON.stringify(exported).includes('secret-value'), false);

  const health = await plane.mcpFederation({ cwd: root, action: 'health', providerId: 'imandra' });
  assert.equal(health.ok, true);
  assert.equal(health.toolCount, 1);
  const discovered = await plane.imandra({ cwd: root, action: 'discover' });
  assert.equal(discovered.toolName, 'reason_about_code');
});

test('control plane registers built-in JEPA/Titans/R3Mem process presets without spawning them', async () => {
  const root = await tempRoot();
  const plane = new OmegaControlPlane({ workspaceRoots: [root] });

  const jepa = await plane.cognitiveProvider({ cwd: root, action: 'preset', providerType: 'jepa', python: 'python3' });
  const titans = await plane.cognitiveProvider({ cwd: root, action: 'preset', providerType: 'titans', python: 'python3' });
  const r3 = await plane.cognitiveProvider({ cwd: root, action: 'preset', providerType: 'r3mem', python: 'python3' });

  assert.equal(jepa.kind, 'process');
  assert.equal(jepa.capabilities.includes('jepa.embed'), true);
  assert.equal(jepa.capabilities.includes('jepa.predict'), false);
  assert.equal(jepa.args[0].endsWith('runtime/jepa_auto_provider.py'), true);
  assert.equal(titans.args[0].endsWith('runtime/titans_auto_provider.py'), true);
  assert.equal(r3.metadata.requiresExternalImplementation, false);

  const listed = await plane.cognitiveProvider({ cwd: root, action: 'list' });
  assert.equal(listed.length, 3);
});

test('runtime doctor probes built-in sidecars without persisting provider registrations', async () => {
  const root = await tempRoot();
  const plane = new OmegaControlPlane({ workspaceRoots: [root] });
  const jepa = await plane.runtimeDoctor({ providerType: 'jepa', python: 'python' });
  const titans = await plane.runtimeDoctor({ providerType: 'titans', python: 'python' });
  const r3 = await plane.runtimeDoctor({ providerType: 'r3mem', python: 'python' });
  assert.equal(typeof jepa.ready, 'boolean');
  assert.equal(typeof titans.ready, 'boolean');
  assert.equal(typeof r3.ready, 'boolean');
  assert.equal(jepa.providerType, 'jepa');
  assert.equal(titans.providerType, 'titans');
  assert.equal(r3.providerType, 'r3mem');
  const listed = await plane.cognitiveProvider({ cwd: root, action: 'list' });
  assert.equal(listed.length, 0);
});

test('local process provider rejects secret-bearing static env values and requires envMap indirection', () => {
  assert.throws(() => new LocalProcessCognitiveProvider({
    id: 'unsafe', command: process.execPath, args: ['-e', ''], cwd: process.cwd(),
    capabilities: ['noop'], env: { API_KEY: 'raw-secret' }
  }), /envMap|secret/i);
});
