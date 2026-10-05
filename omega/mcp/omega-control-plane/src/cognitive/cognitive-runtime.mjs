import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { BitemporalStore } from './bitemporal-store.mjs';
import { CoalaMemory } from './coala-memory.mjs';
import { GMemory } from './g-memory.mjs';
import { HolographicMemory } from './hdc-memory.mjs';
import { HybridRagEngine } from './hybrid-rag.mjs';
import { GraphOfThoughtEngine } from './got-engine.mjs';
import { AdversarialGate } from './adversarial-gate.mjs';
import { DecisionCycle } from './decision-cycle.mjs';
import { ABMCTSScheduler } from './ab-mcts.mjs';
import { EvolutionArchive, DigitalGenotype } from './evolution.mjs';
import { SyntheticRedTeam } from './synthetic-red-team.mjs';
import { AdaptiveModelRouter } from './adaptive-model-router.mjs';

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await rename(tmp, path);
}

function defaultState() {
  return {
    version: 5,
    semantic: [],
    procedures: [],
    interactions: [],
    queries: [],
    insights: [],
    hdc: [],
    got: [],
    cycles: [],
    searches: {},
    evolution: [],
    modelRouter: null
  };
}

export class CognitiveRuntime {
  constructor({ root }) {
    this.root = root;
    this.dir = join(root, '.omega', 'cognitive');
    this.statePath = join(this.dir, 'state.json');
    this.store = new BitemporalStore({ filePath: join(this.dir, 'bitemporal.jsonl') });
    this.coala = new CoalaMemory({ episodicStore: this.store });
    this.gMemory = new GMemory();
    this.hdc = new HolographicMemory({ dimensions: 1024, seed: 'omega-runtime-v5' });
    this.rag = new HybridRagEngine({ coala: this.coala, gMemory: this.gMemory, holographic: this.hdc });
    this.got = new GraphOfThoughtEngine();
    this.gate = new AdversarialGate();
    this.cycles = new Map();
    this.searches = new Map();
    this.evolution = new EvolutionArchive();
    this.redTeam = new SyntheticRedTeam();
    this.modelRouter = new AdaptiveModelRouter();
    this.loaded = false;
  }

  async #ensureLoaded() {
    if (this.loaded) return;
    await mkdir(this.dir, { recursive: true });
    const state = { ...defaultState(), ...(await readJson(this.statePath, defaultState())) };

    for (const item of state.semantic ?? []) this.coala.rememberSemantic(item);
    for (const item of state.procedures ?? []) this.coala.rememberProcedure(item);
    for (const item of state.interactions ?? []) this.gMemory.recordInteraction(item);
    for (const item of state.queries ?? []) this.gMemory.recordQuery(item);
    for (const item of state.insights ?? []) this.gMemory.recordInsight(item);
    for (const item of state.hdc ?? []) this.hdc.store(item.id, item.tokens, item.metadata ?? {});

    this.got = GraphOfThoughtEngine.fromSnapshot(state.got ?? []);
    this.cycles = new Map((state.cycles ?? []).map((snapshot) => [snapshot.id, DecisionCycle.fromSnapshot(snapshot)]));
    this.searches = new Map(Object.entries(state.searches ?? {}).map(([id, snapshot]) => [id, ABMCTSScheduler.fromSnapshot(snapshot)]));
    this.evolution = EvolutionArchive.fromSnapshot(state.evolution ?? []);
    this.modelRouter = state.modelRouter ? AdaptiveModelRouter.fromSnapshot(state.modelRouter) : new AdaptiveModelRouter();
    this.loaded = true;
  }

  async #save() {
    const semantic = [...this.coala.semanticIndex.items.values()].map(({ textTerms, pathTerms, ...rest }) => rest);
    const procedures = [...this.coala.procedures.values()];
    const interactions = [...this.gMemory.interactions.values()];
    const queries = [...this.gMemory.queries.values()];
    const insights = [...this.gMemory.insights.values()];
    const hdc = [...this.hdc.items.values()].map(({ vector, ...rest }) => rest);
    const got = this.got.snapshot();
    const cycles = [...this.cycles.values()].map((cycle) => cycle.snapshot());
    const searches = Object.fromEntries([...this.searches.entries()].map(([id, scheduler]) => [id, scheduler.snapshot()]));
    const evolution = this.evolution.snapshot();
    const modelRouter = this.modelRouter.snapshot();
    await mkdir(this.dir, { recursive: true });
    await atomicWriteJson(this.statePath, { version: 5, semantic, procedures, interactions, queries, insights, hdc, got, cycles, searches, evolution, modelRouter });
  }

  async memory(input) {
    await this.#ensureLoaded();
    switch (input.action) {
      case 'assert':
        return await this.store.assertFact(input);
      case 'correct':
        return await this.store.correctFact(input);
      case 'retract':
        return await this.store.retractFact(input);
      case 'query':
        return await this.store.query(input);
      case 'history':
        return await this.store.history(input);
      case 'snapshot':
        return await this.store.snapshot(input);
      case 'episode-add':
        return await this.coala.rememberEpisode({
          id: input.id ?? randomUUID(), text: input.text, outcome: input.outcome ?? null,
          validFrom: input.validFrom, validTo: input.validTo, txTime: input.txTime, metadata: input.metadata ?? {}
        });
      case 'semantic-add': {
        const result = this.coala.rememberSemantic({ id: input.id ?? randomUUID(), path: input.path ?? [], text: input.text, metadata: input.metadata ?? {} });
        await this.#save();
        return result;
      }
      case 'procedure-add': {
        const result = this.coala.rememberProcedure({ id: input.id ?? randomUUID(), trigger: input.trigger, steps: input.steps ?? [], metadata: input.metadata ?? {} });
        await this.#save();
        return result;
      }
      case 'interaction-add': {
        const result = this.gMemory.recordInteraction({ id: input.id ?? randomUUID(), agents: input.agents ?? [], text: input.text, metadata: input.metadata ?? {} });
        await this.#save();
        return result;
      }
      case 'query-add': {
        const result = this.gMemory.recordQuery({ id: input.id ?? randomUUID(), text: input.text, interactionIds: input.interactionIds ?? [], metadata: input.metadata ?? {} });
        await this.#save();
        return result;
      }
      case 'insight-add': {
        const result = this.gMemory.recordInsight({ id: input.id ?? randomUUID(), text: input.text, queryIds: input.queryIds ?? [], metadata: input.metadata ?? {} });
        await this.#save();
        return result;
      }
      case 'hdc-store': {
        const result = this.hdc.store(input.id ?? randomUUID(), input.tokens ?? [], input.metadata ?? {});
        await this.#save();
        return result;
      }
      case 'retrieve':
        return await this.rag.retrieve(input.query, { limit: input.limit ?? 10, validAt: input.validAt, transactionAt: input.transactionAt });
      default:
        throw new Error(`Unsupported memory action: ${input.action}`);
    }
  }

  async reasoning(input) {
    await this.#ensureLoaded();
    switch (input.action) {
      case 'thought-add': {
        const result = this.got.addThought({ id: input.id, content: input.content, score: input.score ?? 0, parents: input.parents ?? [], metadata: input.metadata ?? {} });
        await this.#save();
        return result;
      }
      case 'thought-connect': {
        const result = this.got.connect(input.parentId, input.childId);
        await this.#save();
        return result;
      }
      case 'thought-frontier': return this.got.frontier({ limit: input.limit ?? 10 });
      case 'thought-snapshot': return this.got.snapshot();
      case 'redteam-generate': return this.redTeam.generate({ surface: input.surface, fields: input.fields ?? [], capabilities: input.capabilities ?? [] });
      case 'gate': return this.gate.decide({ candidateId: input.candidateId, evidenceComplete: Boolean(input.evidenceComplete), findings: input.findings ?? [], retryable: Boolean(input.retryable) });
      case 'decision-step': {
        let cycle = this.cycles.get(input.cycleId);
        if (!cycle) { cycle = new DecisionCycle({ id: input.cycleId }); this.cycles.set(input.cycleId, cycle); }
        const method = String(input.phase ?? '').toLowerCase();
        if (!['observe', 'orient', 'decide', 'act', 'reflect'].includes(method)) throw new Error(`Unsupported decision phase: ${input.phase}`);
        const result = cycle[method](input.payload ?? {});
        await this.#save();
        return result;
      }
      case 'abmcts-create': {
        const scheduler = new ABMCTSScheduler();
        const searchId = input.searchId ?? randomUUID();
        this.searches.set(searchId, scheduler);
        const root = scheduler.createRoot({ id: input.rootId ?? 'root', payload: input.payload ?? {} });
        await this.#save();
        return { searchId, root };
      }
      case 'abmcts-next': {
        const scheduler = this.searches.get(input.searchId);
        if (!scheduler) throw new Error(`Unknown search: ${input.searchId}`);
        return scheduler.nextAction(input.nodeId);
      }
      case 'abmcts-observe': {
        const scheduler = this.searches.get(input.searchId);
        if (!scheduler) throw new Error(`Unknown search: ${input.searchId}`);
        const result = scheduler.observe({ parentId: input.parentId, action: input.branchAction, candidateId: input.candidateId, reward: input.reward, payload: input.payload ?? {} });
        await this.#save();
        return result;
      }
      case 'abmcts-snapshot': {
        const scheduler = this.searches.get(input.searchId);
        if (!scheduler) throw new Error(`Unknown search: ${input.searchId}`);
        return scheduler.snapshot();
      }
      default: throw new Error(`Unsupported reasoning action: ${input.action}`);
    }
  }

  async evolutionAction(input) {
    await this.#ensureLoaded();
    switch (input.action) {
      case 'baseline': {
        const genotype = new DigitalGenotype({ id: input.id, genes: input.genes });
        const result = this.evolution.addBaseline(genotype, input.fitness);
        await this.#save();
        return result;
      }
      case 'evaluate': {
        const parent = this.evolution.entries.get(input.parentId)?.genotype;
        if (!parent) throw new Error(`Unknown parent genotype: ${input.parentId}`);
        const genotype = parent.mutate({ id: input.id, changes: input.changes });
        const result = this.evolution.evaluate(genotype, input.fitness, { hardGates: input.hardGates ?? [] });
        await this.#save();
        return result;
      }
      case 'lineage': return this.evolution.lineage(input.id);
      case 'pareto': return this.evolution.paretoFront();
      case 'snapshot': return this.evolution.snapshot();
      default: throw new Error(`Unsupported evolution action: ${input.action}`);
    }
  }

  async modelRouteAction(input) {
    await this.#ensureLoaded();
    switch (input.action) {
      case 'register': {
        const result = this.modelRouter.registerModel(input);
        await this.#save();
        return result;
      }
      case 'observe': {
        const result = this.modelRouter.observe(input);
        await this.#save();
        return result;
      }
      case 'route': return this.modelRouter.route(input);
      case 'snapshot': return this.modelRouter.snapshot();
      default: throw new Error(`Unsupported model-router action: ${input.action}`);
    }
  }
}
