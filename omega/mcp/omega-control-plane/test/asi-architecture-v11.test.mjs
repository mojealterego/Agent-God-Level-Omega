import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ActiveInferencePlanner, RipsTopologyAnalyzer, LayeredConsistencyGate, ActivationFactorizer,
  SemanticDependencyGraph, FractalSwarmPlanner, AutopoieticBoundary, CrossModalFeatureSpace,
  ProofCarryingResult, DiscreteAnnealer, AnticipatoryScenarioMemory, HyperdimensionalVSA,
  QasmCircuitBuilder, InformationBottleneckMacroModel, NarsTruthEngine, PreferenceGovernance,
  RetrospectiveCorrectionLedger
} from '../src/asi/asi-architecture.mjs';

test('active inference selects action with minimum expected free energy', () => {
  const p = new ActiveInferencePlanner({ epistemicWeight: 1 });
  const r = p.rank([
    {id:'safe', outcomes:[{probability:1, preferredProbability:.8, ambiguity:.1, informationGain:.1}]},
    {id:'learn', outcomes:[{probability:1, preferredProbability:.7, ambiguity:.1, informationGain:.5}]}
  ]);
  assert.equal(r[0].id, 'learn');
  assert.ok(r[0].expectedFreeEnergy < r[1].expectedFreeEnergy);
});

test('Rips topology reports components and graph-cycle Betti1 at bounded threshold', () => {
  const t = new RipsTopologyAnalyzer();
  const square = [[0,0],[1,0],[1,1],[0,1]];
  const r = t.analyze(square,{threshold:1.01});
  assert.equal(r.betti0,1);
  assert.equal(r.betti1Graph,1);
  assert.equal(r.fullPersistentHomologyClaimed,false);
});

test('layered consistency gate blocks self-reference cycles and direct contradictions', () => {
  const g = new LayeredConsistencyGate({maxDepth:8});
  const r = g.check({dependencies:[['a','b'],['b','a']], assertions:[{key:'safe',value:true},{key:'safe',value:false}]});
  assert.equal(r.allowed,false);
  assert.ok(r.findings.some(x=>x.code==='DEPENDENCY_CYCLE'));
  assert.ok(r.findings.some(x=>x.code==='CONTRADICTION'));
  assert.equal(r.haltingProblemSolved,false);
});

test('activation factorizer produces bounded NMF components without monosemanticity claims', () => {
  const f = new ActivationFactorizer({components:2,iterations:80,epsilon:1e-9});
  const r = f.factorize([[1,0,.1],[.9,.1,0],[0,1,.9],[.1,.9,1]]);
  assert.equal(r.components.length,2);
  assert.equal(r.monosemanticityProven,false);
  assert.ok(Number.isFinite(r.reconstructionError));
});

test('semantic dependency graph lazily invalidates transitive dependents on concept update', () => {
  const g = new SemanticDependencyGraph();
  g.upsert('policy',{version:1}); g.upsert('router',{version:1}); g.upsert('app',{version:1});
  g.link('router','policy'); g.link('app','router');
  const r = g.upsert('policy',{version:2});
  assert.deepEqual(r.invalidated.sort(),['app','router']);
  assert.equal(g.get('app').stale,true);
});

test('fractal swarm planner obeys depth and node budgets', () => {
  const p = new FractalSwarmPlanner({branching:3,maxDepth:3,maxNodes:10});
  const tree = p.plan({id:'root',complexity:9}, node => node.complexity > 1 ? Array.from({length:3},(_,i)=>({id:`${node.id}.${i}`,complexity:node.complexity/3})) : []);
  assert.ok(tree.nodeCount <= 10);
  assert.ok(tree.maxObservedDepth <= 3);
});

test('autopoietic boundary protects core identity and classifies external resources', () => {
  const b = new AutopoieticBoundary({core:['src/core/policy.mjs','src/server.mjs'], protectedPatterns:['src/core/**']});
  assert.equal(b.classify('src/core/policy.mjs'),'CORE');
  assert.equal(b.classify('vendor/tool.js'),'ENVIRONMENT');
  assert.equal(b.authorizeMutation('src/core/policy.mjs',{approved:false}).allowed,false);
});

test('cross-modal feature space compares canonical adapter outputs without claiming zero-shot equivalence', () => {
  const x = new CrossModalFeatureSpace({dimensions:4});
  x.register('text', v => [v.length,1,0,0]);
  x.register('image', v => [v.edges,1,0,0]);
  const r = x.compare({modality:'text',value:'abc'},{modality:'image',value:{edges:3}});
  assert.ok(r.similarity > .99);
  assert.equal(r.zeroShotIsomorphismClaimed,false);
});

test('proof carrying result verifies Ed25519 signature and payload integrity', () => {
  const p = new ProofCarryingResult();
  const keys = p.generateKeyPair();
  const att = p.sign({task:'compile',resultHash:'abc'}, keys.privateKey);
  assert.equal(p.verify(att,keys.publicKey).valid,true);
  const tampered = structuredClone(att); tampered.payload.task='delete';
  assert.equal(p.verify(tampered,keys.publicKey).valid,false);
  assert.equal(att.zeroKnowledge,false);
});

test('discrete simulated annealer can escape a local minimum with deterministic random stream', () => {
  const seq=[0.1,0.01,0.7,0.2,0.8,0.3,0.9]; let i=0;
  const a = new DiscreteAnnealer({initialTemperature:10,cooling:0.8,steps:20,random:()=>seq[i++%seq.length]});
  const states={A:{energy:5,neighbors:['B']},B:{energy:7,neighbors:['A','C']},C:{energy:1,neighbors:['B']}};
  const r=a.optimize('A',id=>states[id].neighbors,id=>states[id].energy);
  assert.equal(r.best.id,'C');
});

test('anticipatory scenario memory persists bounded future plans and retrieves similar scenario', async () => {
  const dir=await mkdtemp(join(tmpdir(),'omega-future-'));
  const m=new AnticipatoryScenarioMemory({filePath:join(dir,'future.json'),threshold:.4});
  await m.put({id:'api-rate-limit',signature:'provider returns 429 rate limit',plan:{action:'backoff'},probability:.3});
  const hit=await m.recall('external provider rate limit 429');
  assert.equal(hit.plan.action,'backoff');
  assert.equal(hit.precomputed,true);
});

test('HDC/VSA supports 10k-dimensional binding, permutation, bundle and noisy cleanup', () => {
  const h=new HyperdimensionalVSA({dimensions:10000,seed:'test'});
  const a=h.symbol('alpha'), b=h.symbol('beta');
  const bound=h.bind(a,b); assert.equal(bound.length,10000);
  const perm=h.permute(bound,37); assert.equal(perm.length,10000);
  const noisy=h.corrupt(a,.2,()=>.1);
  const clean=h.cleanup(noisy,['alpha','beta']);
  assert.equal(clean.symbol,'alpha');
});

test('QASM builder emits valid bounded OpenQASM 3 circuit but does not claim quantum advantage', () => {
  const q=new QasmCircuitBuilder({qubits:2});
  q.h(0).cx(0,1).measureAll();
  const out=q.render();
  assert.match(out.qasm,/OPENQASM 3/);
  assert.equal(out.quantumAdvantageClaimed,false);
});

test('information bottleneck ranks macro mappings by predictive information minus complexity', () => {
  const ib=new InformationBottleneckMacroModel({beta:.2});
  const rows=[
    {x:'a1',y:'up'},{x:'a2',y:'up'},{x:'b1',y:'down'},{x:'b2',y:'down'}
  ];
  const r=ib.compare(rows,[
    {id:'fine', map:x=>x},
    {id:'macro', map:x=>x[0]}
  ]);
  assert.equal(r[0].id,'macro');
});

test('NARS truth engine revises evidence frequency and confidence', () => {
  const n=new NarsTruthEngine({k:1});
  const a=n.fromEvidence({positive:9,total:10});
  const b=n.fromEvidence({positive:1,total:2});
  const r=n.revise(a,b);
  assert.ok(r.frequency > .7 && r.frequency < .9);
  assert.ok(r.confidence > a.confidence);
});

test('preference governance uses explicit stakeholder constraints and never claims simulated CEV', () => {
  const g=new PreferenceGovernance();
  const r=g.evaluate({action:{id:'deploy',attributes:{risk:.2,cost:5}},preferences:[{key:'risk',max:.1,weight:10},{key:'cost',max:10,weight:1}]});
  assert.equal(r.allowed,false);
  assert.equal(r.cevClaimed,false);
});

test('retrospective correction ledger records failed decision signature and penalizes recurrence without retrocausality claims', async () => {
  const dir=await mkdtemp(join(tmpdir(),'omega-retro-'));
  const l=new RetrospectiveCorrectionLedger({filePath:join(dir,'retro.json')});
  await l.recordFailure({decisionId:'d1',signature:'remove-validation',transactionTime:'2026-10-05T10:00:00Z',reason:'security failure'});
  const r=await l.evaluate('remove-validation');
  assert.equal(r.blocked,true);
  assert.equal(r.retrocausalityClaimed,false);
});
