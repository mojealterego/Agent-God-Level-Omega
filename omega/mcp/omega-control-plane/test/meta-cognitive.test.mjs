import assert from 'node:assert/strict';
import test from 'node:test';

import { McpGateway } from '../src/cognitive/mcp-gateway.mjs';
import { TitansRetentionController } from '../src/cognitive/titans-retention.mjs';
import { JepaPredictiveAdapter } from '../src/cognitive/jepa-adapter.mjs';
import { ReasoningRouter } from '../src/cognitive/reasoning-router.mjs';
import { AlphaEvolveEngine, RecursiveSelfImprovementController, DigitalGenotype } from '../src/cognitive/evolution-engine.mjs';
import { SyntheticRedTeam } from '../src/cognitive/synthetic-red-team.mjs';

test('MCP gateway routes to highest-priority healthy provider and opens circuit after repeated failures', async () => {
  let failures = 0;
  const gateway = new McpGateway({ failureThreshold: 2, cooldownMs: 1000, clock: () => 1000 });
  gateway.register({
    id: 'primary',
    capabilities: ['verify'],
    priority: 10,
    invoke: async () => {
      failures += 1;
      throw new Error(`boom-${failures}`);
    }
  });
  gateway.register({
    id: 'fallback',
    capabilities: ['verify'],
    priority: 5,
    invoke: async (operation, input) => ({ provider: 'fallback', operation, input })
  });

  const first = await gateway.invoke('verify', 'check', { x: 1 });
  assert.equal(first.providerId, 'fallback');
  const second = await gateway.invoke('verify', 'check', { x: 1 });
  assert.equal(second.providerId, 'fallback');
  const result = await gateway.invoke('verify', 'check', { x: 2 });
  assert.equal(result.providerId, 'fallback');
  assert.equal(gateway.status().find(x => x.id === 'primary').circuit, 'OPEN');
});

test('Titans-inspired retention uses surprise, momentum and decay without claiming weight updates', () => {
  const memory = new TitansRetentionController({ decay: 0.9, momentum: 0.5, threshold: 0.4 });
  const low = memory.observe({ id: 'boilerplate', predictionLoss: 0.05, importance: 0.2 });
  const high = memory.observe({ id: 'novel-failure', predictionLoss: 0.9, importance: 1 });
  assert.equal(low.retain, false);
  assert.equal(high.retain, true);
  const cooled = memory.decayAll();
  assert.ok(cooled.find(x => x.id === 'novel-failure').score < high.score);
});

test('JEPA adapter delegates latent prediction to a real injected predictor and reports normalized error', async () => {
  const adapter = new JepaPredictiveAdapter({
    predictor: async ({ context }) => context.map(x => x * 2)
  });
  const exact = await adapter.evaluate({ context: [1, 2], target: [2, 4] });
  assert.equal(exact.error, 0);
  const miss = await adapter.evaluate({ context: [1, 2], target: [2, 5] });
  assert.ok(miss.error > 0);
  assert.equal(miss.provider, 'injected-predictor');
});

test('reasoning router selects cheapest provider meeting quality and capability constraints', () => {
  const router = new ReasoningRouter();
  router.registerModel({ id: 'small', capabilities: ['code'], quality: 0.7, costPerUnit: 1, maxComplexity: 0.5 });
  router.registerModel({ id: 'large', capabilities: ['code', 'formal'], quality: 0.95, costPerUnit: 5, maxComplexity: 1 });
  const easy = router.route({ capability: 'code', complexity: 0.3, minQuality: 0.65, budget: 10 });
  const hard = router.route({ capability: 'formal', complexity: 0.9, minQuality: 0.9, budget: 10 });
  assert.equal(easy.id, 'small');
  assert.equal(hard.id, 'large');
  assert.throws(() => router.route({ capability: 'formal', complexity: 0.9, minQuality: 0.9, budget: 2 }), /No eligible model/);
});

test('AlphaEvolve engine keeps hard gates, lineage and best candidate under bounded iterations', async () => {
  const engine = new AlphaEvolveEngine({
    maxIterations: 4,
    generate: async ({ parent, iteration }) => parent.mutate({ id: `g${iteration}`, changes: { value: parent.genes.value + 1 } }),
    evaluate: async (genotype) => ({ correctness: 1, score: genotype.genes.value })
  });
  const baseline = new DigitalGenotype({ id: 'g0', genes: { value: 0 } });
  const result = await engine.run({ baseline, hardGates: ['correctness'], objective: 'score' });
  assert.equal(result.iterations, 4);
  assert.equal(result.best.genotype.genes.value, 4);
  assert.equal(result.archive.lineage('g4').map(x => x.id).join('>'), 'g0>g1>g2>g3>g4');
});

test('RSI controller refuses adoption without independent evaluation and improvement margin', async () => {
  const controller = new RecursiveSelfImprovementController({ improvementMargin: 0.1, maxGenerations: 2 });
  const base = new DigitalGenotype({ id: 'base', genes: { strategy: 'a' } });
  controller.seed(base, { correctness: 1, score: 0.5 });
  const bad = base.mutate({ id: 'bad', changes: { strategy: 'b' } });
  const rejected = controller.consider(bad, { correctness: 1, score: 0.55 }, { hardGates: ['correctness'], objective: 'score' });
  assert.equal(rejected.adopted, false);
  const good = base.mutate({ id: 'good', changes: { strategy: 'c' } });
  const accepted = controller.consider(good, { correctness: 1, score: 0.7 }, { hardGates: ['correctness'], objective: 'score' });
  assert.equal(accepted.adopted, true);
  assert.equal(controller.current.id, 'good');
});


test('synthetic red team generates bounded counterexamples across correctness, security and resilience classes', () => {
  const red = new SyntheticRedTeam({ maxCases: 12 });
  const cases = red.generate({
    surface: 'api',
    fields: [
      { name: 'path', type: 'string' },
      { name: 'count', type: 'number', min: 0, max: 100 }
    ],
    capabilities: ['network', 'filesystem']
  });
  assert.ok(cases.length <= 12);
  const categories = new Set(cases.map(x => x.category));
  assert.equal(categories.has('boundary'), true);
  assert.equal(categories.has('security'), true);
  assert.equal(categories.has('resilience'), true);
  assert.equal(new Set(cases.map(x => x.id)).size, cases.length);
});
