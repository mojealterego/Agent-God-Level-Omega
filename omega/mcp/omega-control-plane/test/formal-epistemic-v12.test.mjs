import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FiniteCategory, FunctorVerifier, BelnapLogic, LukasiewiczLogic,
  EpistemicDefragmenter, PortableIrCompiler, FiniteStateVerifier,
  SubstrateExperimentPlanner, HybridComputeRouter, EnergyBudgetGovernor,
  ConstitutionManifest, AlignmentRegressionGate, FallibilismGate
} from '../src/formal/formal-epistemic-architecture.mjs';

test('finite category validates identities, composition and associativity', () => {
  const c = new FiniteCategory({
    objects:['A','B','C'], identities:{A:'idA',B:'idB',C:'idC'},
    morphisms:[
      {id:'idA',from:'A',to:'A'},{id:'idB',from:'B',to:'B'},{id:'idC',from:'C',to:'C'},
      {id:'f',from:'A',to:'B'},{id:'g',from:'B',to:'C'},{id:'gf',from:'A',to:'C'}
    ],
    composition:{'idA|idA':'idA','idB|idB':'idB','idC|idC':'idC','f|idA':'f','idB|f':'f','g|idB':'g','idC|g':'g','gf|idA':'gf','idC|gf':'gf','g|f':'gf'}
  });
  const r = c.verify();
  assert.equal(r.valid,true);
  assert.deepEqual(c.compose('g','f'), c.morphism('gf'));
});

test('functor verifier checks identity and composition preservation', () => {
  const source = new FiniteCategory({objects:['A','B'],identities:{A:'idA',B:'idB'},morphisms:[{id:'idA',from:'A',to:'A'},{id:'idB',from:'B',to:'B'},{id:'f',from:'A',to:'B'}],composition:{'idA|idA':'idA','idB|idB':'idB','f|idA':'f','idB|f':'f'}});
  const target = new FiniteCategory({objects:['X','Y'],identities:{X:'idX',Y:'idY'},morphisms:[{id:'idX',from:'X',to:'X'},{id:'idY',from:'Y',to:'Y'},{id:'u',from:'X',to:'Y'}],composition:{'idX|idX':'idX','idY|idY':'idY','u|idX':'u','idY|u':'u'}});
  const result = new FunctorVerifier().verify({source,target,objectMap:{A:'X',B:'Y'},morphismMap:{idA:'idX',idB:'idY',f:'u'}});
  assert.equal(result.valid,true);
});

test('Belnap four-valued logic preserves true false both and neither', () => {
  const b = new BelnapLogic();
  assert.equal(b.fromEvidence({positive:3,negative:0}).label,'TRUE');
  assert.equal(b.fromEvidence({positive:0,negative:2}).label,'FALSE');
  assert.equal(b.fromEvidence({positive:2,negative:1}).label,'BOTH');
  assert.equal(b.fromEvidence({positive:0,negative:0}).label,'NEITHER');
  assert.equal(b.not(b.value('TRUE')).label,'FALSE');
});

test('Lukasiewicz logic computes bounded many-valued operators', () => {
  const l = new LukasiewiczLogic();
  assert.equal(l.not(0.2),0.8);
  assert.equal(l.and(0.7,0.6),0.3);
  assert.equal(l.or(0.7,0.6),1);
  assert.equal(l.implies(0.8,0.3),0.5);
});

test('epistemic defragmenter quarantines unresolved contradictions and resolves strong evidence', () => {
  const d = new EpistemicDefragmenter({resolutionMargin:0.25});
  const r = d.scan([
    {id:'a',key:'api.version',value:'v1',perspective:'runtime',confidence:0.9,evidence:['e1']},
    {id:'b',key:'api.version',value:'v2',perspective:'runtime',confidence:0.55,evidence:['e2']},
    {id:'c',key:'db.mode',value:'primary',perspective:'runtime',confidence:0.7,evidence:['e3']},
    {id:'d',key:'db.mode',value:'replica',perspective:'runtime',confidence:0.65,evidence:['e4']}
  ]);
  assert.equal(r.resolved.length,1);
  assert.equal(r.quarantined.length,1);
  assert.equal(r.resolved[0].winner.id,'a');
});

test('portable IR compiles a bounded expression kernel to JS Python and C99', () => {
  const ir={name:'score',inputs:[{name:'x',type:'f64'},{name:'y',type:'f64'}],output:{type:'f64'},expr:{op:'add',args:[{var:'x'},{op:'mul',args:[{var:'y'},{const:2}]}]}};
  const c = new PortableIrCompiler();
  assert.match(c.compile(ir,'javascript'),/function score/);
  assert.match(c.compile(ir,'python'),/def score/);
  assert.match(c.compile(ir,'c99'),/double score/);
  assert.throws(()=>c.compile(ir,'neuromorphic-microcode'));
});

test('finite-state verifier exhaustively checks reachable states and invariants', () => {
  const v = new FiniteStateVerifier({maxStates:100});
  const ok = v.verify({initial:'S0',transitions:{S0:['S1'],S1:['S2'],S2:[]},invariants:[{id:'not-bad',check:(s)=>s!=='BAD'}]});
  assert.equal(ok.valid,true);
  const bad = v.verify({initial:'S0',transitions:{S0:['BAD'],BAD:[]},invariants:[{id:'not-bad',check:(s)=>s!=='BAD'}]});
  assert.equal(bad.valid,false);
  assert.equal(bad.counterexample.state,'BAD');
});

test('substrate planner ranks candidates under constraints without claiming fabrication', () => {
  const p = new SubstrateExperimentPlanner();
  const r = p.rank({candidates:[
    {id:'silicon',metrics:{throughput:5,watts:4,thermal:3,readiness:1}},
    {id:'graphene-lab',metrics:{throughput:9,watts:2,thermal:2,readiness:0.2}}
  ],objectives:[{key:'throughput',direction:'max',weight:2},{key:'watts',direction:'min',weight:1}],constraints:{readiness:{min:0.5}}});
  assert.equal(r[0].id,'silicon');
  assert.equal(r[0].eligible,true);
  assert.equal(r.find(x=>x.id==='graphene-lab').eligible,false);
});

test('hybrid compute router never claims quantum advantage and routes only to available provider', () => {
  const r = new HybridComputeRouter().route({problem:{kind:'combinatorial-search',size:20},classical:{available:true,estimatedMs:30},quantum:{available:false,estimatedMs:5}});
  assert.equal(r.route,'classical');
  assert.equal(r.quantumAdvantageClaimed,false);
});

test('energy governor computes energy carbon and budget decision', () => {
  const g = new EnergyBudgetGovernor();
  const r = g.evaluate({powerWatts:200,durationSeconds:3600,carbonIntensityGPerKwh:400,budgetKwh:0.25});
  assert.equal(r.energyKwh,0.2);
  assert.equal(r.carbonGrams,80);
  assert.equal(r.withinBudget,true);
});

test('constitution manifest hashes protected policy and alignment gate blocks weakened candidate', () => {
  const c = new ConstitutionManifest({rules:[{id:'no-delete',effect:'DENY',protected:true},{id:'require-evidence',effect:'REQUIRE',protected:true}]});
  const manifest = c.snapshot();
  const gate = new AlignmentRegressionGate();
  const good = gate.evaluate({baseline:manifest,candidate:c.snapshot(),regressions:[]});
  assert.equal(good.allowed,true);
  const weakened = new ConstitutionManifest({rules:[{id:'no-delete',effect:'ALLOW',protected:true},{id:'require-evidence',effect:'REQUIRE',protected:true}]}).snapshot();
  const bad = gate.evaluate({baseline:manifest,candidate:weakened,regressions:[]});
  assert.equal(bad.allowed,false);
});

test('fallibilism gate requires evidence and rollback for uncertain high-impact decisions', () => {
  const g = new FallibilismGate({highImpactThreshold:0.98,normalThreshold:0.75});
  const blocked = g.decide({confidence:0.96,risk:'high',unresolvedAssumptions:1,rollbackCheckpoint:false});
  assert.equal(blocked.action,'REVIEW');
  const ok = g.decide({confidence:0.99,risk:'high',unresolvedAssumptions:0,rollbackCheckpoint:true});
  assert.equal(ok.action,'PROCEED');
});
