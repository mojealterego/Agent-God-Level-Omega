import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CognitiveRuntime } from '../src/cognitive/cognitive-runtime.mjs';
import { RemoteMcpFederation } from '../src/cognitive/remote-mcp-federation.mjs';
import { ImandraCodeLogicianProvider } from '../src/cognitive/imandra-provider.mjs';
import { ExternalCognitiveProvider } from '../src/cognitive/external-cognitive-provider.mjs';
import { BenchmarkHarness } from '../src/cognitive/benchmark-harness.mjs';
import { AdaptiveModelRouter } from '../src/cognitive/adaptive-model-router.mjs';

async function tempRoot() {
  return await mkdtemp(join(tmpdir(), 'omega-v5-'));
}

test('GoT, AB-MCTS and evolution archives survive CognitiveRuntime recreation', async () => {
  const root = await tempRoot();
  const first = new CognitiveRuntime({ root });
  await first.reasoning({ action: 'thought-add', id: 't1', content: 'baseline', score: 0.6 });
  const created = await first.reasoning({ action: 'abmcts-create', searchId: 's1', rootId: 'r1', payload: { mission: 'x' } });
  assert.equal(created.searchId, 's1');
  await first.reasoning({ action: 'abmcts-observe', searchId: 's1', parentId: 'r1', branchAction: 'WIDEN', candidateId: 'c1', reward: 0.9, payload: { variant: 1 } });
  await first.evolutionAction({ action: 'baseline', id: 'g0', genes: { strategy: 'base' }, fitness: { correctness: 1, score: 1 } });
  await first.evolutionAction({ action: 'evaluate', parentId: 'g0', id: 'g1', changes: { strategy: 'mutant' }, fitness: { correctness: 1, score: 2 }, hardGates: ['correctness'] });

  const second = new CognitiveRuntime({ root });
  const thoughts = await second.reasoning({ action: 'thought-snapshot' });
  assert.equal(thoughts.some((x) => x.id === 't1'), true);
  const search = await second.reasoning({ action: 'abmcts-snapshot', searchId: 's1' });
  assert.equal(search.nodes.some((x) => x.id === 'c1'), true);
  const lineage = await second.evolutionAction({ action: 'lineage', id: 'g1' });
  assert.deepEqual(lineage.map((x) => x.id), ['g0', 'g1']);
});

test('remote MCP federation discovers tools and invokes real client surface through injected SDK client factory', async () => {
  const calls = [];
  const federation = new RemoteMcpFederation({
    clientFactory: async ({ id, endpoint, headers }) => ({
      async listTools() { return { tools: [{ name: 'verify_code' }, { name: 'search' }] }; },
      async callTool({ name, arguments: args }) { calls.push({ id, endpoint, headers, name, args }); return { content: [{ type: 'text', text: 'ok' }] }; },
      async close() {}
    })
  });
  federation.register({ id: 'formal', endpoint: 'https://formal.example/mcp', priority: 10, capabilities: ['formal'], headers: { 'X-Test': '1' } });
  const tools = await federation.listTools('formal');
  assert.deepEqual(tools.map((x) => x.name), ['verify_code', 'search']);
  const result = await federation.callTool({ providerId: 'formal', name: 'verify_code', arguments: { source: 'x' } });
  assert.equal(result.providerId, 'formal');
  assert.equal(calls[0].name, 'verify_code');
});

test('Imandra CodeLogician provider uses discovered MCP tool and never fabricates verification', async () => {
  const fake = {
    async listTools() { return [{ name: 'reason_about_code' }, { name: 'other' }]; },
    async callTool({ providerId, name, arguments: args }) { return { providerId, result: { structuredContent: { verdict: 'proved' }, args, name } }; }
  };
  const provider = new ImandraCodeLogicianProvider({ federation: fake, providerId: 'imandra' });
  const discovered = await provider.discover();
  assert.equal(discovered.toolName, 'reason_about_code');
  const out = await provider.verify({ source: 'let x = 1', property: 'x = 1' });
  assert.equal(out.providerId, 'imandra');
  assert.equal(out.toolName, 'reason_about_code');
  assert.equal(out.result.structuredContent.verdict, 'proved');
});

test('external cognitive provider supports real HTTP-style transport contracts for JEPA, Titans and R3Mem operations', async () => {
  const seen = [];
  const provider = new ExternalCognitiveProvider({
    id: 'research-stack',
    kind: 'http',
    endpoint: 'https://models.example/v1',
    capabilities: ['jepa.predict', 'titans.memorize', 'r3mem.compress'],
    transport: async (request) => { seen.push(request); return { ok: true, operation: request.operation, payload: request.payload }; }
  });
  const jepa = await provider.invoke('jepa.predict', { context: [1, 2] });
  const titans = await provider.invoke('titans.memorize', { tokens: ['a'] });
  const r3 = await provider.invoke('r3mem.compress', { text: 'history' });
  assert.equal(jepa.operation, 'jepa.predict');
  assert.equal(titans.operation, 'titans.memorize');
  assert.equal(r3.operation, 'r3mem.compress');
  assert.equal(seen.length, 3);
  await assert.rejects(() => provider.invoke('unsupported', {}), /capability/i);
});

test('benchmark harness produces reproducible aggregate metrics and rejects failed candidates', async () => {
  const durations = [10, 12, 11, 9, 13];
  let i = 0;
  const harness = new BenchmarkHarness({
    clock: () => 0,
    runner: async ({ candidate }) => ({ exitCode: candidate.fail ? 1 : 0, durationMs: durations[i++ % durations.length], stdout: JSON.stringify({ correctness: candidate.fail ? 0 : 1, score: candidate.score }) })
  });
  const good = await harness.evaluate({ candidate: { id: 'good', score: 7 }, repetitions: 5, hardGates: ['correctness'] });
  assert.equal(good.admitted, true);
  assert.equal(good.metrics.samples, 5);
  assert.equal(good.metrics.p50DurationMs, 11);
  const bad = await harness.evaluate({ candidate: { id: 'bad', fail: true, score: 99 }, repetitions: 1, hardGates: ['correctness'] });
  assert.equal(bad.admitted, false);
});

test('adaptive model router learns from latency, quality, cost and failures and restores snapshot', () => {
  const router = new AdaptiveModelRouter({ exploration: 0 });
  router.registerModel({ id: 'fast', capabilities: ['code'], baseQuality: 0.8, costPerUnit: 1, maxComplexity: 1 });
  router.registerModel({ id: 'strong', capabilities: ['code'], baseQuality: 0.95, costPerUnit: 4, maxComplexity: 1 });
  router.observe({ id: 'fast', success: true, quality: 0.85, latencyMs: 100, cost: 1 });
  router.observe({ id: 'strong', success: true, quality: 0.98, latencyMs: 600, cost: 4 });
  const chosen = router.route({ capability: 'code', complexity: 0.5, minQuality: 0.8, budget: 5, weights: { quality: 1, latency: 0.004, cost: 0.2, reliability: 1 } });
  assert.equal(chosen.id, 'fast');
  router.observe({ id: 'fast', success: false, quality: 0, latencyMs: 1000, cost: 1 });
  router.observe({ id: 'fast', success: false, quality: 0, latencyMs: 1000, cost: 1 });
  const snap = router.snapshot();
  const restored = AdaptiveModelRouter.fromSnapshot(snap, { exploration: 0 });
  assert.deepEqual(restored.snapshot(), snap);
});

import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane persists remote MCP and cognitive provider registrations without persisting secret values', async () => {
  const root = await tempRoot();
  const clientFactory = async () => ({
    async listTools() { return { tools: [{ name: 'verify_code' }] }; },
    async callTool(input) { return { structuredContent: input }; },
    async close() {}
  });
  const providerTransport = async ({ operation, payload }) => ({ operation, payload });
  const plane = new OmegaControlPlane({ workspaceRoots: [root], mcpClientFactory: clientFactory, cognitiveProviderTransport: providerTransport });
  await plane.mcpFederation({ cwd: root, action: 'register', id: 'remote', endpoint: 'https://mcp.example/mcp', capabilities: ['formal'], headerEnv: { Authorization: 'OMEGA_TEST_TOKEN' } });
  await plane.cognitiveProvider({ cwd: root, action: 'register', id: 'jepa', providerType: 'jepa', endpoint: 'https://models.example/jepa' });

  const plane2 = new OmegaControlPlane({ workspaceRoots: [root], mcpClientFactory: clientFactory, cognitiveProviderTransport: providerTransport });
  const remotes = await plane2.mcpFederation({ cwd: root, action: 'list' });
  const providers = await plane2.cognitiveProvider({ cwd: root, action: 'list' });
  assert.equal(remotes[0].id, 'remote');
  assert.equal(remotes[0].headerEnv, undefined);
  assert.equal(providers[0].id, 'jepa');
  assert.equal(providers[0].capabilities.includes('jepa.predict'), true);
});

test('adaptive model router state survives control-plane recreation', async () => {
  const root = await tempRoot();
  const plane = new OmegaControlPlane({ workspaceRoots: [root] });
  await plane.modelRouter({ cwd: root, action: 'register', id: 'm1', capabilities: ['code'], baseQuality: 0.8, costPerUnit: 1, maxComplexity: 1 });
  await plane.modelRouter({ cwd: root, action: 'observe', id: 'm1', success: true, quality: 0.9, latencyMs: 50, cost: 1 });
  const plane2 = new OmegaControlPlane({ workspaceRoots: [root] });
  const chosen = await plane2.modelRouter({ cwd: root, action: 'route', capability: 'code', complexity: 0.5, minQuality: 0.8, budget: 2 });
  assert.equal(chosen.id, 'm1');
  assert.equal(chosen.estimate.quality, 0.9);
});

test('remote provider configuration rejects raw secret headers and non-local insecure HTTP', async () => {
  const federation = new RemoteMcpFederation({ clientFactory: async () => ({ async close() {} }) });
  await assert.rejects(() => federation.register({ id: 'bad-secret', endpoint: 'https://mcp.example/mcp', headers: { Authorization: 'Bearer should-not-persist' } }), /headerEnv/i);
  await assert.rejects(() => federation.register({ id: 'bad-http', endpoint: 'http://example.com/mcp' }), /HTTPS/i);
});

test('adaptive model router can execute the selected federated MCP model and records transport reliability without fabricating quality', async () => {
  const root = await tempRoot();
  const clientFactory = async () => ({
    async listTools() { return { tools: [{ name: 'reason' }] }; },
    async callTool({ name, arguments: args }) { return { structuredContent: { name, answer: args.prompt } }; },
    async close() {}
  });
  const plane = new OmegaControlPlane({ workspaceRoots: [root], mcpClientFactory: clientFactory });
  await plane.mcpFederation({ cwd: root, action: 'register', id: 'reason-mcp', endpoint: 'https://reason.example/mcp', capabilities: ['reason'] });
  await plane.modelRouter({ cwd: root, action: 'register', id: 'reasoner', capabilities: ['reason'], baseQuality: 0.9, costPerUnit: 2, maxComplexity: 1, metadata: { mcpProviderId: 'reason-mcp', toolName: 'reason' } });
  const executed = await plane.modelRouter({ cwd: root, action: 'invoke', capability: 'reason', complexity: 0.5, minQuality: 0.8, budget: 3, payload: { prompt: 'solve' } });
  assert.equal(executed.route.id, 'reasoner');
  assert.equal(executed.result.result.structuredContent.answer, 'solve');
  const snapshot = await plane.modelRouter({ cwd: root, action: 'snapshot' });
  const stats = snapshot.models.find((m) => m.id === 'reasoner').stats;
  assert.equal(stats.successes, 1);
  assert.equal(stats.qualityCount, 0);
});
