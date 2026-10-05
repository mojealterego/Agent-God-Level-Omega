import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  NegotiationEngine,
  DecisionMatrix,
  FailureMemory,
  RetryController,
  LatencyBudget,
  EpsilonGreedyBandit,
  DriftDetector,
  ServiceRegistry,
  FuzzyResolver,
  DagExecutor,
  GracefulDegradation,
  ConfidenceGate,
  NaiveBayesRouter,
  ContextOptimizer,
  KnowledgeGraph,
  ShadowExperiment,
  PreferenceLedger,
  DistillationDataset,
  GoalRewardOptimizer,
  StructuredOutputValidator,
  IncidentPostmortem,
  SpeculativePrefetch
} from '../src/meta/meta-architecture.mjs';

test('negotiation engine quantifies TCO, BATNA leverage and SLA tradeoffs', () => {
  const engine = new NegotiationEngine();
  const result = engine.compare({
    horizonMonths: 12,
    options: [
      { id: 'vendor-a', fixedMonthly: 2000, variableMonthly: 500, migrationCost: 5000, engineeringHoursMonthly: 10, hourlyRate: 100, accuracy: 0.98, p95LatencyMs: 800 },
      { id: 'vendor-b', fixedMonthly: 1200, variableMonthly: 700, migrationCost: 2000, engineeringHoursMonthly: 6, hourlyRate: 100, accuracy: 0.955, p95LatencyMs: 350 }
    ],
    constraints: { minAccuracy: 0.95, maxP95LatencyMs: 1000 },
    incumbentId: 'vendor-a',
    batnaId: 'vendor-b'
  });
  assert.equal(result.options[0].tco, 47000);
  assert.equal(result.options[1].tco, 32000);
  assert.equal(result.recommended.id, 'vendor-b');
  assert.equal(result.batna.id, 'vendor-b');
  assert.ok(result.leverage.savingsVsIncumbent > 0);
});

test('decision matrix uses normalized weighted criteria and hard gates', () => {
  const matrix = new DecisionMatrix();
  const ranked = matrix.rank({
    criteria: [
      { key: 'quality', weight: 0.5, direction: 'max' },
      { key: 'cost', weight: 0.3, direction: 'min' },
      { key: 'latency', weight: 0.2, direction: 'min' }
    ],
    options: [
      { id: 'a', metrics: { quality: 0.99, cost: 10, latency: 900 }, eligible: true },
      { id: 'b', metrics: { quality: 0.96, cost: 3, latency: 300 }, eligible: true },
      { id: 'c', metrics: { quality: 1.0, cost: 1, latency: 100 }, eligible: false }
    ]
  });
  assert.equal(ranked[0].id, 'b');
  assert.equal(ranked.at(-1).id, 'c');
  assert.equal(ranked.at(-1).eligible, false);
});

test('failure memory persists failures and retrieves similar cases', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'omega-failure-'));
  const path = join(dir, 'failures.json');
  const memory = new FailureMemory({ filePath: path });
  await memory.add({ id: 'f1', task: 'android gradle build', error: 'Could not resolve dependency kotlin plugin', lesson: 'verify repository and plugin versions first' });
  await memory.add({ id: 'f2', task: 'database migration', error: 'lock timeout on postgres', lesson: 'use bounded lock timeout and retry' });
  const hits = await memory.search('gradle kotlin dependency build', { limit: 1 });
  assert.equal(hits[0].id, 'f1');
  const reloaded = new FailureMemory({ filePath: path });
  assert.equal((await reloaded.search('postgres lock migration', { limit: 1 }))[0].id, 'f2');
});

test('retry controller honors Retry-After and bounded exponential backoff with jitter', () => {
  const retry = new RetryController({ baseMs: 1000, maxMs: 10000, maxAttempts: 5, random: () => 0.5 });
  assert.equal(retry.delayFor({ attempt: 1 }), 1000);
  assert.equal(retry.delayFor({ attempt: 2 }), 2000);
  assert.equal(retry.delayFor({ attempt: 3, retryAfterMs: 7000 }), 7000);
  assert.equal(retry.shouldRetry({ attempt: 5, status: 429 }), false);
  assert.equal(retry.shouldRetry({ attempt: 2, status: 429 }), true);
  assert.equal(retry.shouldRetry({ attempt: 2, status: 400 }), false);
});

test('latency budget returns partial results at deadline without waiting for slow tasks', async () => {
  const budget = new LatencyBudget({ timeoutMs: 40 });
  const started = Date.now();
  const result = await budget.collect([
    { id: 'fast', run: async () => { await new Promise(r => setTimeout(r, 5)); return 1; } },
    { id: 'slow', run: async () => { await new Promise(r => setTimeout(r, 120)); return 2; } }
  ]);
  assert.equal(result.results.fast, 1);
  assert.equal(result.timedOut, true);
  assert.ok(Date.now() - started < 100);
});

test('epsilon-greedy bandit explores and learns rewards deterministically', () => {
  const sequence = [0.01, 0.9, 0.99, 0.1];
  const bandit = new EpsilonGreedyBandit({ epsilon: 0.05, random: () => sequence.shift() ?? 0.99 });
  bandit.register('stable');
  bandit.register('experimental');
  bandit.observe('stable', 0.7);
  bandit.observe('experimental', 0.95);
  assert.equal(bandit.select().mode, 'explore');
  assert.equal(bandit.select().arm, 'experimental');
});

test('drift detector detects cosine-distance anomaly against historical centroid', () => {
  const detector = new DriftDetector({ threshold: 0.35, dimensions: 32 });
  detector.observe('english customer support billing question');
  detector.observe('english billing invoice support');
  const normal = detector.score('customer billing support invoice');
  const anomaly = detector.score('polski przepis kulinarny zupa pomidorowa');
  assert.ok(normal.distance < anomaly.distance);
  assert.equal(anomaly.anomalous, true);
});

test('service registry expires unhealthy services and resolves by capability', () => {
  let now = 1000;
  const registry = new ServiceRegistry({ now: () => now });
  registry.register({ id: 'svc-a', capabilities: ['vision'], endpoint: 'https://a.example', ttlMs: 100 });
  registry.register({ id: 'svc-b', capabilities: ['vision', 'ocr'], endpoint: 'https://b.example', ttlMs: 500 });
  assert.equal(registry.resolve('vision')[0].id, 'svc-a');
  now = 1200;
  assert.equal(registry.resolve('vision')[0].id, 'svc-b');
});

test('fuzzy resolver asks for clarification when multiple candidates are close', () => {
  const resolver = new FuzzyResolver({ ambiguityMargin: 0.1, minScore: 0.2 });
  const result = resolver.resolve('raport wczoraj', [
    { id: 'sales', label: 'Raport sprzedaż wczoraj' },
    { id: 'server', label: 'Raport serwer wczoraj' },
    { id: 'hr', label: 'Raport HR wczoraj' }
  ]);
  assert.equal(result.status, 'AMBIGUOUS');
  assert.ok(result.candidates.length >= 2);
});

test('DAG executor runs dependencies in order and independent nodes concurrently', async () => {
  const events = [];
  const executor = new DagExecutor({ concurrency: 2 });
  const result = await executor.run([
    { id: 'a', deps: [], run: async () => { events.push('a:start'); await new Promise(r => setTimeout(r, 10)); events.push('a:end'); return 'A'; } },
    { id: 'b', deps: [], run: async () => { events.push('b:start'); await new Promise(r => setTimeout(r, 10)); events.push('b:end'); return 'B'; } },
    { id: 'c', deps: ['a', 'b'], run: async ({ results }) => { events.push('c'); return results.a + results.b; } }
  ]);
  assert.equal(result.results.c, 'AB');
  assert.ok(events.indexOf('c') > events.indexOf('a:end'));
  assert.ok(events.indexOf('c') > events.indexOf('b:end'));
});

test('graceful degradation selects healthy fallback and can shed optional work', () => {
  const degradation = new GracefulDegradation();
  const selected = degradation.select([
    { id: 'vector-cluster', healthy: false, priority: 100, capability: 'semantic-search' },
    { id: 'local-index', healthy: true, priority: 50, capability: 'basic-search' }
  ], { requiredCapability: null });
  assert.equal(selected.id, 'local-index');
  const shed = degradation.loadShed([{ id: 'core', priority: 100 }, { id: 'prefetch', priority: 5 }, { id: 'analytics', priority: 20 }], { keep: 2 });
  assert.deepEqual(shed.kept.map(x => x.id), ['core', 'analytics']);
});

test('confidence gate escalates high-risk low-confidence actions to human review', () => {
  const gate = new ConfidenceGate({ defaultThreshold: 0.8, highRiskThreshold: 0.98 });
  assert.equal(gate.decide({ confidence: 0.9, risk: 'low' }).action, 'AUTO');
  assert.equal(gate.decide({ confidence: 0.97, risk: 'high' }).action, 'HUMAN_REVIEW');
});

test('naive bayes router learns a fast heuristic classifier', () => {
  const router = new NaiveBayesRouter();
  router.train('spam', 'free money click winner');
  router.train('spam', 'claim prize free');
  router.train('support', 'billing invoice account problem');
  router.train('support', 'customer account invoice');
  assert.equal(router.classify('free prize winner').label, 'spam');
  assert.equal(router.classify('invoice account billing').label, 'support');
});

test('context optimizer preserves recent messages and high-salience older evidence under token budget', () => {
  const optimizer = new ContextOptimizer({ recentCount: 3 });
  const items = [
    { id: 'critical', text: 'security constraint never expose secrets', tokens: 8, salience: 1 },
    { id: 'old-noise', text: 'old successful build log', tokens: 8, salience: 0.1 },
    { id: 'r1', text: 'recent one', tokens: 5, salience: 0.2 },
    { id: 'r2', text: 'recent two', tokens: 5, salience: 0.2 },
    { id: 'r3', text: 'recent three', tokens: 5, salience: 0.2 }
  ];
  const result = optimizer.compact(items, { maxTokens: 25 });
  assert.ok(result.items.some(x => x.id === 'critical'));
  assert.ok(result.items.some(x => x.id === 'r3'));
  assert.ok(!result.items.some(x => x.id === 'old-noise'));
});

test('knowledge graph persists problem-solution relationships', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'omega-kg-'));
  const graph = new KnowledgeGraph({ filePath: join(dir, 'graph.json') });
  await graph.upsertNode({ id: 'bug-x', type: 'Bug', data: { title: 'X' } });
  await graph.upsertNode({ id: 'fix-y', type: 'Script', data: { path: 'fix.js' } });
  await graph.link({ from: 'bug-x', to: 'fix-y', relation: 'RESOLVED_BY' });
  const related = await graph.neighbors('bug-x', { relation: 'RESOLVED_BY' });
  assert.equal(related[0].node.id, 'fix-y');
});

test('shadow experiment compares baseline and candidate from observed traffic metrics', () => {
  const exp = new ShadowExperiment();
  exp.observe({ baseline: { success: true, latencyMs: 600, cost: 0.02, score: 0.8 }, candidate: { success: true, latencyMs: 350, cost: 0.01, score: 0.84 } });
  exp.observe({ baseline: { success: true, latencyMs: 500, cost: 0.02, score: 0.82 }, candidate: { success: true, latencyMs: 300, cost: 0.01, score: 0.86 } });
  const result = exp.summary();
  assert.ok(result.candidate.avgLatencyMs < result.baseline.avgLatencyMs);
  assert.ok(result.delta.avgScore > 0);
});

test('preference ledger records feedback but never claims online DPO weight updates', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'omega-pref-'));
  const ledger = new PreferenceLedger({ filePath: join(dir, 'preferences.json') });
  await ledger.add({ prompt: 'x', chosen: 'a', rejected: 'b', source: 'user-downvote' });
  const exported = await ledger.export();
  assert.equal(exported.records.length, 1);
  assert.equal(exported.trainingApplied, false);
});

test('distillation dataset exports teacher examples without claiming a trained student model', () => {
  const dataset = new DistillationDataset();
  dataset.add({ input: '2+2', teacherOutput: '4', metadata: { teacher: 'large-model' } });
  const out = dataset.export();
  assert.equal(out.examples.length, 1);
  assert.equal(out.studentTrained, false);
});

test('goal reward optimizer chooses candidate by constrained global reward', () => {
  const optimizer = new GoalRewardOptimizer();
  const best = optimizer.select([
    { id: 'a', metrics: { engagement: 0.10, hallucination: 0.02, cost: 10 } },
    { id: 'b', metrics: { engagement: 0.08, hallucination: 0.005, cost: 4 } }
  ], {
    reward: { engagement: 1, hallucination: -2, cost: -0.01 },
    constraints: { hallucination: { max: 0.01 } }
  });
  assert.equal(best.id, 'b');
});

test('structured output validator rejects malformed objects with precise field paths', () => {
  const validator = new StructuredOutputValidator();
  const schema = {
    type: 'object', required: ['name', 'score'], additionalProperties: false,
    properties: { name: { type: 'string' }, score: { type: 'number', minimum: 0, maximum: 1 } }
  };
  assert.equal(validator.validate({ name: 'ok', score: 0.5 }, schema).valid, true);
  const bad = validator.validate({ name: 'x', score: 2, extra: true }, schema);
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.some(e => e.path === '$.score'));
  assert.ok(bad.errors.some(e => e.path === '$.extra'));
});

test('incident postmortem is blameless and maps failure to process/guardrail actions', () => {
  const postmortem = new IncidentPostmortem();
  const report = postmortem.build({
    incident: 'toxic output reached user',
    contributingFactors: ['missing output classifier', 'no canary monitoring'],
    actions: [{ owner: 'platform', action: 'add classifier gate' }]
  });
  assert.equal(report.blamePolicy, 'BLAMELESS');
  assert.equal(report.actions[0].action, 'add classifier gate');
});

test('speculative prefetch only starts work above confidence threshold and supports cancellation', async () => {
  const prefetch = new SpeculativePrefetch({ threshold: 0.8 });
  const low = prefetch.schedule({ id: 'q2-low', confidence: 0.5, run: async () => 1 });
  assert.equal(low.started, false);
  const high = prefetch.schedule({ id: 'q2', confidence: 0.9, run: async ({ signal }) => { await new Promise(r => setTimeout(r, 5)); return signal.aborted ? 'aborted' : 'ready'; } });
  assert.equal(high.started, true);
  assert.equal(await prefetch.result('q2'), 'ready');
});

import { AsyncJobRegistry, SemanticClusterRouter, DecisionTraceAuditor } from '../src/meta/meta-architecture.mjs';

test('async job registry persists long-running job state and accepts webhook-style completion events', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'omega-jobs-'));
  const registry = new AsyncJobRegistry({ filePath: join(dir, 'jobs.json') });
  await registry.register({ id: 'train-1', provider: 'trainer', externalId: 'abc', status: 'PENDING' });
  assert.equal((await registry.status('train-1')).status, 'PENDING');
  await registry.complete({ id: 'train-1', status: 'SUCCEEDED', result: { model: 'm1' } });
  const restored = new AsyncJobRegistry({ filePath: join(dir, 'jobs.json') });
  assert.equal((await restored.status('train-1')).result.model, 'm1');
});

test('semantic cluster router performs real deterministic k-means over hashed text vectors', () => {
  const router = new SemanticClusterRouter({ dimensions: 48, k: 2, iterations: 8 });
  router.fit([
    { id: 'billing-1', text: 'invoice payment billing account' },
    { id: 'billing-2', text: 'customer invoice refund payment' },
    { id: 'android-1', text: 'android gradle apk kotlin build' },
    { id: 'android-2', text: 'android compose gradle emulator apk' }
  ]);
  const result = router.route('gradle android apk build');
  assert.ok(result.members.some((x) => x.id.startsWith('android-')));
});

test('decision trace auditor validates evidence coverage without requesting hidden chain of thought', () => {
  const auditor = new DecisionTraceAuditor();
  const good = auditor.audit({
    decision: 'use provider B',
    claims: [
      { id: 'cost', statement: 'B is cheaper', evidenceIds: ['e-cost'] },
      { id: 'latency', statement: 'B meets latency', evidenceIds: ['e-latency'] }
    ],
    evidence: [
      { id: 'e-cost', state: 'OBSERVED' },
      { id: 'e-latency', state: 'OBSERVED' }
    ]
  });
  assert.equal(good.valid, true);
  const bad = auditor.audit({ decision: 'ship', claims: [{ id: 'x', statement: 'tests pass', evidenceIds: ['missing'] }], evidence: [] });
  assert.equal(bad.valid, false);
  assert.equal(bad.hiddenChainOfThoughtRequired, false);
});

import { TechnologyRadar, SamplingPolicy } from '../src/meta/meta-architecture.mjs';

test('technology radar persists evidence-backed adopt/trial/assess/hold status', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'omega-radar-'));
  const radar = new TechnologyRadar({ filePath: join(dir, 'radar.json') });
  await radar.upsert({ id: 'new-runtime', ring: 'ASSESS', evidence: ['benchmark-1'], risks: ['young ecosystem'] });
  await radar.upsert({ id: 'new-runtime', ring: 'TRIAL', evidence: ['benchmark-1', 'shadow-2'], risks: [] });
  const item = await radar.get('new-runtime');
  assert.equal(item.ring, 'TRIAL');
  assert.deepEqual(item.evidence, ['benchmark-1', 'shadow-2']);
});

test('sampling policy returns bounded provider parameters instead of pretending to alter model weights', () => {
  const policy = new SamplingPolicy();
  const creative = policy.forMode('creative');
  const deterministic = policy.forMode('deterministic');
  assert.ok(creative.temperature > deterministic.temperature);
  assert.ok(creative.topP <= 1 && creative.topP > 0);
  assert.equal(creative.weightMutation, false);
});
