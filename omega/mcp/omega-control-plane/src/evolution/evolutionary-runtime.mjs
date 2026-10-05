import { join } from 'node:path';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import {
  ConfigMutator, EvolutionTournament, CausalGraph, ReplayBuffer, MemoryConsolidator,
  ParadigmShiftMonitor, HomeostasisGate, ProofObligationGate, SystemStateRegistry,
  SafeSelfImprovementProtocol, SemanticCache, VectorEnvelopeBus, CrossExaminer,
  ConstitutionalGate, TemporalKnowledgeRanker, ResourceAllocator, PromptPruner,
  HardNegativeMiner, EvidenceFusion, LoadSheddingController, DomainProfileRegistry,
  CapabilityHandshake, ChaosExperimentGate, VectorTopologyMap, InputTrustGate,
  ParetoFrontier, ScenarioPlanner, GaussianPerturber, LegacyFixedWidthCodec,
  TrainingPlanBuilder, OfflineFallbackRouter, CurriculumScheduler, MemoryDefragmenter,
  SchemaAligner, ModalityRouter, BayesianABTest, TrustLedger, HardwareDesignSpace
} from './evolutionary-architecture.mjs';

export class EvolutionaryArchitectureRuntime {
  constructor({ root, sandboxRunner = null } = {}) {
    if (!root) throw new Error('root is required');
    this.root = root;
    this.sandboxRunner = sandboxRunner;
    this.replay = new ReplayBuffer({ filePath: join(root,'.omega','experience-replay.json') });
    this.shift = new ParadigmShiftMonitor();
    this.homeostasis = new HomeostasisGate();
    this.proofGate = new ProofObligationGate();
    this.state = new SystemStateRegistry({ filePath: join(root,'.omega','system-state.json') });
    this.rsi = new SafeSelfImprovementProtocol({ filePath: join(root,'.omega','rsi-candidates.json') });
    this.semanticCache = new SemanticCache({ filePath: join(root,'.omega','semantic-cache.json') });
    this.vectorBus = new VectorEnvelopeBus({ dimensions: 64 });
    this.crossExam = new CrossExaminer();
    this.constitution = new ConstitutionalGate({ rules: [
      { id:'delete-knowledge-base', action:'delete-knowledge-base', effect:'DENY_UNLESS_APPROVED', approvals:2 },
      { id:'rewrite-history', action:'force-push-or-history-rewrite', effect:'DENY_UNLESS_APPROVED', approvals:2 },
      { id:'prod-destructive', action:'production-destructive-change', effect:'DENY_UNLESS_APPROVED', approvals:2 }
    ]});
    this.knowledgeRanker = new TemporalKnowledgeRanker();
    this.resourceAllocator = null;
    this.promptPruner = new PromptPruner();
    this.hardNegatives = new HardNegativeMiner();
    this.fusion = new EvidenceFusion();
    this.load = new LoadSheddingController();
    this.domains = new DomainProfileRegistry({ filePath: join(root,'.omega','domain-profiles.json') });
    this.handshake = new CapabilityHandshake();
    this.chaos = new ChaosExperimentGate();
    this.topology = new VectorTopologyMap();
    this.inputTrust = new InputTrustGate();
    this.pareto = new ParetoFrontier();
    this.scenarios = new ScenarioPlanner();
    this.noise = new GaussianPerturber();
    this.training = new TrainingPlanBuilder();
    this.offline = new OfflineFallbackRouter();
    this.curriculum = new CurriculumScheduler();
    this.defrag = new MemoryDefragmenter();
    this.modality = new ModalityRouter();
    this.ab = new BayesianABTest();
    this.trust = new TrustLedger({ filePath: join(root,'.omega','trust-ledger.json') });
    this.hardware = new HardwareDesignSpace();
  }

  async action(input) {
    const p = input.payload ?? {};
    switch (input.action) {
      case 'mutate-config': return new ConfigMutator({allowedPaths:p.allowedPaths??[]}).apply(p.config??{},p.mutations??[]);
      case 'evolution-select': return new EvolutionTournament().select(p);
      case 'causal-counterfactual': { const g=new CausalGraph(); for(const n of p.nodes??[])g.add(n); return g.counterfactual(p.context??{},p.intervention??{}); }
      case 'replay-add': return await this.replay.add(p.record);
      case 'replay-sample': return await this.replay.sample({limit:p.limit??10});
      case 'memory-consolidate': return new MemoryConsolidator().consolidate(p.items??[],p.options??{});
      case 'shift-observe': return this.shift.observe(p.loss);
      case 'shift-status': return this.shift.status();
      case 'homeostasis-evaluate': return new HomeostasisGate({weights:p.weights??undefined}).evaluate(p);
      case 'proof-gate': return this.proofGate.evaluate(p.obligations??[]);
      case 'state-snapshot': return await this.state.snapshot(p.state);
      case 'state-latest': return await this.state.latest();
      case 'state-diff': return await this.state.diffLatest();
      case 'rsi-create': return await this.rsi.create(p.candidate);
      case 'rsi-advance': return await this.rsi.advance(p.id,p.transition);
      case 'cache-put': return await this.semanticCache.put(p);
      case 'cache-get': return await this.semanticCache.get(p);
      case 'vector-send': return this.vectorBus.send(p);
      case 'vector-receive': return this.vectorBus.receive(p.to);
      case 'cross-examine': return this.crossExam.examine(p);
      case 'constitution-decide': return this.constitution.decide(p);
      case 'knowledge-score': return { score:this.knowledgeRanker.score(p.item,p.now) };
      case 'resource-init': this.resourceAllocator=new ResourceAllocator({capacity:p.capacity??{}}); return {initialized:true,capacity:p.capacity??{}};
      case 'resource-allocate': if(!this.resourceAllocator)throw new Error('resource allocator not initialized'); return this.resourceAllocator.allocate(p.id,p.quota);
      case 'resource-donate': if(!this.resourceAllocator)throw new Error('resource allocator not initialized'); return this.resourceAllocator.donate(p);
      case 'prompt-prune': return this.promptPruner.prune(p);
      case 'hard-negative-rank': return this.hardNegatives.rank(p.items??[]);
      case 'evidence-fuse': return this.fusion.fuse(p.items??[]);
      case 'load-admit': return this.load.admit(p);
      case 'domain-upsert': return await this.domains.upsert(p.profile);
      case 'domain-activate': return await this.domains.activate(p.id);
      case 'handshake-negotiate': return this.handshake.negotiate(p.descriptor,p.requirements??{});
      case 'chaos-authorize': return this.chaos.authorize(p);
      case 'topology-build': return new VectorTopologyMap(p.options??{}).build(p.items??[]);
      case 'input-trust': return this.inputTrust.inspect(p);
      case 'pareto-front': return this.pareto.compute(p.items??[],p.objectives??[]);
      case 'scenario-plan': return this.scenarios.evaluate(p.options??[],p.config??{});
      case 'noise-perturb': return new GaussianPerturber().perturb(p.params??{},p.config??{});
      case 'legacy-decode': return new LegacyFixedWidthCodec(p.fields??[]).decode(p.line??'');
      case 'legacy-encode': return new LegacyFixedWidthCodec(p.fields??[]).encode(p.value??{});
      case 'training-plan': return this.training.plan(p);
      case 'offline-route': return this.offline.route(p.providers??[],{offline:p.offline??false});
      case 'curriculum-observe': return {level:this.curriculum.observe(p.success)};
      case 'curriculum-level': return {level:this.curriculum.level()};
      case 'memory-defrag': return this.defrag.compact(p.items??[]);
      case 'schema-align': return new SchemaAligner({aliases:p.aliases??{}}).align(p.input??{},p.target??{});
      case 'modality-route': return this.modality.route(p.providers??[],{modality:p.modality});
      case 'ab-observe': return this.ab.observe(p.variant,p.success);
      case 'ab-summary': return this.ab.summary();
      case 'trust-observe': return await this.trust.observe(p);
      case 'trust-get': return await this.trust.get(p.id);
      case 'hardware-rank': return this.hardware.rank(p.candidates??[],p.config??{});
      case 'sandbox-tournament': return await this.#sandboxTournament(p);
      case 'ephemeral-tool-run': return await this.#ephemeralTool(p);
      case 'chaos-sandbox-run': return await this.#chaosSandbox(p);
      default: throw new Error(`Unsupported evolutionary-architecture action: ${input.action}`);
    }
  }

  async #sandboxTournament({baseline,candidates=[],objectives=[],hardGates=[],image='node:22-alpine',engine='docker',memory='1g',cpus='1'}={}) {
    if (!this.sandboxRunner) throw new Error('sandboxRunner unavailable');
    const runCandidate = async (c) => {
      const result = await this.sandboxRunner({engine,image,workspace:this.root,command:c.command,writable:false,network:'none',memory,cpus,env:c.env??{}});
      if (result.exitCode !== 0) return {id:c.id,metrics:{...(c.failureMetrics??{}),errors:1},execution:result};
      let metrics; try{metrics=JSON.parse(String(result.stdout??'').trim());}catch{throw new Error(`Candidate ${c.id} did not emit JSON metrics`);}
      return {id:c.id,metrics,execution:{exitCode:result.exitCode,durationMs:result.durationMs}};
    };
    const measuredBase=await runCandidate(baseline); const measured=[]; for(const c of candidates) measured.push(await runCandidate(c));
    return new EvolutionTournament().select({baseline:measuredBase,candidates:measured,objectives,hardGates});
  }

  async #ephemeralTool({id='tool',content,filename='tool.py',image='python:3.13-alpine',command=null,engine='docker',memory='512m',cpus='1'}={}) {
    if (!this.sandboxRunner) throw new Error('sandboxRunner unavailable');
    if (typeof content !== 'string' || !content.trim()) throw new Error('content is required');
    const parent=join(this.root,'.omega');
    await mkdir(parent,{recursive:true});
    const dir=await mkdtemp(join(parent,`ephemeral-${id}-`));
    try{
      await writeFile(join(dir,filename),content,'utf8');
      return await this.sandboxRunner({engine,image,workspace:dir,command:command??['python',`/workspace/${filename}`],writable:false,network:'none',memory,cpus,env:{}});
    } finally { await rm(dir,{recursive:true,force:true}); }
  }

  async #chaosSandbox({environment='staging',authorized=false,image='alpine:3.20',command,engine='docker',memory='256m',cpus='1'}={}) {
    this.chaos.authorize({environment,authorized});
    if (!this.sandboxRunner) throw new Error('sandboxRunner unavailable');
    return await this.sandboxRunner({engine,image,workspace:this.root,command,writable:false,network:'none',memory,cpus,env:{OMEGA_CHAOS:'1'}});
  }
}
