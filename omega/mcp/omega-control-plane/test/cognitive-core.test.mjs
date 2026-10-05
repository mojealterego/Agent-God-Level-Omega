import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { BitemporalStore } from '../src/cognitive/bitemporal-store.mjs';
import { BitemporalGraphMemory } from '../src/cognitive/bitemporal-graph.mjs';
import { HolographicMemory } from '../src/cognitive/hdc-memory.mjs';
import { ShimiIndex } from '../src/cognitive/shimi-index.mjs';
import { GMemory } from '../src/cognitive/g-memory.mjs';
import { CoalaMemory } from '../src/cognitive/coala-memory.mjs';
import { HybridRagEngine } from '../src/cognitive/hybrid-rag.mjs';
import { GraphOfThoughtEngine } from '../src/cognitive/got-engine.mjs';
import { AdversarialGate } from '../src/cognitive/adversarial-gate.mjs';
import { ReflexionLoop } from '../src/cognitive/reflexion.mjs';
import { ABMCTSScheduler } from '../src/cognitive/ab-mcts.mjs';
import { EvolutionArchive, DigitalGenotype } from '../src/cognitive/evolution.mjs';
import { DecisionCycle } from '../src/cognitive/decision-cycle.mjs';
import { SpikingSalienceModulator } from '../src/cognitive/snn-salience.mjs';

async function tempFile(name='memory.jsonl') {
  const root = await mkdtemp(join(tmpdir(), 'omega-cognitive-'));
  return join(root, name);
}

test('bitemporal store preserves transaction history and supports retrospective correction', async () => {
  const file = await tempFile();
  const store = new BitemporalStore({ filePath: file });
  const first = await store.assertFact({ key: 'branch', value: 'main', validFrom: '2026-01-01T00:00:00.000Z', txTime: '2026-01-02T00:00:00.000Z' });
  await store.correctFact({ assertionId: first.assertionId, value: 'integration', txTime: '2026-01-03T00:00:00.000Z' });

  const beforeCorrection = await store.query({ key: 'branch', validAt: '2026-01-04T00:00:00.000Z', transactionAt: '2026-01-02T12:00:00.000Z' });
  const afterCorrection = await store.query({ key: 'branch', validAt: '2026-01-04T00:00:00.000Z', transactionAt: '2026-01-04T00:00:00.000Z' });
  assert.deepEqual(beforeCorrection.map(x => x.value), ['main']);
  assert.deepEqual(afterCorrection.map(x => x.value), ['integration']);
});

test('bitemporal graph returns neighbors at valid and transaction time', async () => {
  const store = new BitemporalStore({ filePath: await tempFile() });
  const graph = new BitemporalGraphMemory({ store });
  await graph.upsertNode({ id: 'repo', value: { type: 'repository' }, validFrom: '2026-01-01T00:00:00.000Z', txTime: '2026-01-01T00:00:00.000Z' });
  await graph.upsertNode({ id: 'ci', value: { type: 'service' }, validFrom: '2026-01-01T00:00:00.000Z', txTime: '2026-01-01T00:00:00.000Z' });
  await graph.link({ id: 'repo-ci', from: 'repo', to: 'ci', relation: 'verified-by', validFrom: '2026-01-01T00:00:00.000Z', txTime: '2026-01-01T00:00:00.000Z' });
  const neighbors = await graph.neighbors({ id: 'repo', validAt: '2026-02-01T00:00:00.000Z', transactionAt: '2026-02-01T00:00:00.000Z' });
  assert.equal(neighbors.length, 1);
  assert.equal(neighbors[0].node.id, 'ci');
  assert.equal(neighbors[0].relation, 'verified-by');
});

test('holographic memory binds, bundles and retrieves related symbolic vectors', () => {
  const h = new HolographicMemory({ dimensions: 512, seed: 'omega' });
  h.store('git-main', ['git', 'branch', 'main']);
  h.store('android-apk', ['android', 'apk', 'gradle']);
  const hits = h.search(['git', 'branch'], { limit: 1 });
  assert.equal(hits[0].id, 'git-main');
  assert.ok(hits[0].score > 0);
});

test('SHIMI hierarchical index retrieves through semantic hierarchy and exact terms', () => {
  const index = new ShimiIndex();
  index.add({ id: 'gradle', path: ['engineering', 'android', 'build'], text: 'Gradle assembleRelease produces Android APK artifacts' });
  index.add({ id: 'ci', path: ['engineering', 'delivery', 'ci'], text: 'GitHub Actions executes remote verification workflows' });
  const hits = index.search('android release apk', { limit: 2 });
  assert.equal(hits[0].id, 'gradle');
  assert.ok(hits[0].score > hits[1].score);
});

test('G-Memory retains interaction, query and insight hierarchy', () => {
  const memory = new GMemory();
  const interaction = memory.recordInteraction({ agents: ['implementer', 'critic'], text: 'CI failed due to missing Android SDK 36' });
  const query = memory.recordQuery({ text: 'Why did Android CI fail?', interactionIds: [interaction.id] });
  const insight = memory.recordInsight({ text: 'Pin and provision SDK 36 before Gradle verification', queryIds: [query.id] });
  const result = memory.retrieve('SDK 36 Gradle', { limit: 3 });
  assert.equal(result.some(x => x.id === insight.id), true);
});

test('CoALA memory separates working, episodic, semantic and procedural memory', async () => {
  const coala = new CoalaMemory({ episodicStore: new BitemporalStore({ filePath: await tempFile() }), workingLimit: 2 });
  coala.rememberWorking({ id: 'w1', text: 'inspect repo' });
  coala.rememberWorking({ id: 'w2', text: 'run tests' });
  coala.rememberWorking({ id: 'w3', text: 'patch bug' });
  assert.deepEqual(coala.working.map(x => x.id), ['w2', 'w3']);
  await coala.rememberEpisode({ id: 'e1', text: 'test failed with timeout', outcome: 'failure', txTime: '2026-01-01T00:00:00.000Z' });
  coala.rememberProcedure({ id: 'p1', trigger: 'timeout', steps: ['reproduce', 'bound retry', 'rerun'] });
  coala.rememberSemantic({ id: 's1', path: ['debugging', 'timeout'], text: 'timeouts require bounded retries' });
  const episodic = await coala.recallEpisodes('failure', { transactionAt: '2026-02-01T00:00:00.000Z' });
  assert.equal(episodic.length, 1);
  assert.equal(coala.recallProcedures('timeout')[0].id, 'p1');
  assert.equal(coala.recallSemantic('bounded retries')[0].id, 's1');
});

test('hybrid RAG fuses episodic, hierarchical, graph and holographic retrieval', async () => {
  const coala = new CoalaMemory({ episodicStore: new BitemporalStore({ filePath: await tempFile() }) });
  await coala.rememberEpisode({ id: 'ep1', text: 'Gradle build failed because SDK 36 was absent', outcome: 'failure', txTime: '2026-01-01T00:00:00.000Z' });
  coala.rememberSemantic({ id: 'sem1', path: ['android', 'build'], text: 'Install SDK 36 for targetSdk 36' });
  const g = new GMemory();
  g.recordInsight({ text: 'Provision Android SDK before CI build', queryIds: [] });
  const h = new HolographicMemory({ dimensions: 256 });
  h.store('hdc1', ['android', 'sdk', 'gradle']);
  const rag = new HybridRagEngine({ coala, gMemory: g, holographic: h });
  const result = await rag.retrieve('android sdk 36 gradle', { limit: 5, transactionAt: '2026-02-01T00:00:00.000Z' });
  assert.ok(result.length >= 3);
  assert.equal(new Set(result.map(x => x.source)).size >= 3, true);
});

test('Graph of Thought engine supports merge, scoring, cycles detection and frontier ranking', () => {
  const got = new GraphOfThoughtEngine();
  got.addThought({ id: 'a', content: 'use cache', score: 0.4 });
  got.addThought({ id: 'b', content: 'batch requests', score: 0.8 });
  got.addThought({ id: 'c', content: 'combine', score: 0.9, parents: ['a', 'b'] });
  assert.deepEqual(got.frontier({ limit: 1 }).map(x => x.id), ['c']);
  assert.throws(() => got.connect('c', 'a'), /cycle/i);
});

test('adversarial gate blocks candidates with critical findings and routes missing evidence', () => {
  const gate = new AdversarialGate();
  assert.equal(gate.decide({ candidateId: 'x', evidenceComplete: false, findings: [] }).decision, 'RETRIEVE_EVIDENCE');
  assert.equal(gate.decide({ candidateId: 'x', evidenceComplete: true, findings: [{ severity: 'critical', code: 'SECRET_LEAK' }] }).decision, 'CORRECT');
  assert.equal(gate.decide({ candidateId: 'x', evidenceComplete: true, findings: [] }).decision, 'ACCEPT');
});

test('Reflexion stores outcome-weighted lessons without overwriting episodes', async () => {
  const coala = new CoalaMemory({ episodicStore: new BitemporalStore({ filePath: await tempFile() }) });
  const loop = new ReflexionLoop({ memory: coala });
  await loop.record({ taskId: 't1', attempt: 1, action: 'retry blindly', outcome: 'failure', lesson: 'classify transient errors first', txTime: '2026-01-01T00:00:00.000Z' });
  await loop.record({ taskId: 't1', attempt: 2, action: 'bounded retry', outcome: 'success', lesson: 'retry only transient failures', txTime: '2026-01-02T00:00:00.000Z' });
  const lessons = await loop.lessons('retry', { transactionAt: '2026-02-01T00:00:00.000Z' });
  assert.equal(lessons.length, 2);
  assert.ok(lessons[0].quality >= lessons[1].quality);
});

test('AB-MCTS chooses adaptive branching and updates action posterior from rewards', () => {
  const scheduler = new ABMCTSScheduler({ random: () => 0.5 });
  const root = scheduler.createRoot({ id: 'root', payload: { prompt: 'solve' } });
  const action1 = scheduler.nextAction(root.id);
  assert.ok(['WIDEN', 'DEEPEN'].includes(action1.type));
  const child = scheduler.observe({ parentId: root.id, action: action1.type, candidateId: 'c1', reward: 1, payload: {} });
  assert.equal(child.parentId, root.id);
  const snapshot = scheduler.snapshot();
  assert.equal(snapshot.nodes.length, 2);
  assert.equal(snapshot.posteriors[action1.type].successes, 1);
});

test('Digital genotype mutation archive keeps lineage and admits only gate-passing candidates', () => {
  const archive = new EvolutionArchive();
  const base = new DigitalGenotype({ id: 'g0', genes: { search: 'sequential', memory: 'episodic' } });
  archive.addBaseline(base, { correctness: 1, latency: 100 });
  const mutant = base.mutate({ id: 'g1', changes: { search: 'ab-mcts' } });
  const rejected = archive.evaluate(mutant, { correctness: 0, latency: 50 }, { hardGates: ['correctness'] });
  assert.equal(rejected.admitted, false);
  const mutant2 = base.mutate({ id: 'g2', changes: { search: 'ab-mcts', memory: 'hybrid' } });
  const accepted = archive.evaluate(mutant2, { correctness: 1, latency: 80 }, { hardGates: ['correctness'] });
  assert.equal(accepted.admitted, true);
  assert.equal(archive.lineage('g2').map(x => x.id).join('>'), 'g0>g2');
});

test('decision cycle enforces ordered observe-orient-decide-act-reflect transitions', () => {
  const cycle = new DecisionCycle({ id: 'd1' });
  cycle.observe({ signal: 'test failed' });
  cycle.orient({ hypothesis: 'timeout' });
  cycle.decide({ action: 'reproduce' });
  cycle.act({ result: 'reproduced' });
  cycle.reflect({ lesson: 'timeout confirmed' });
  assert.equal(cycle.state, 'OBSERVE');
  assert.equal(cycle.history.length, 5);
  assert.throws(() => cycle.decide({ action: 'skip' }), /expected OBSERVE/i);
});

test('spiking salience modulator emits bounded spikes for high-surprise event sequences', () => {
  const snn = new SpikingSalienceModulator({ threshold: 1, decay: 0.5 });
  assert.equal(snn.step(0.4).spike, false);
  assert.equal(snn.step(0.9).spike, true);
  const after = snn.step(0.1);
  assert.ok(after.potential >= 0 && after.potential < 1);
});
