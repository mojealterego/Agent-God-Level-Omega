import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ClinicalJudgmentGate, CostEstimator, PrecisionEngine, MultisensoryFusion,
  InstallationPlanner3D, AffectivePolicy, IncidentManager, RawInputInspector,
  PhaseSynchronizer, CellularEvolutionMemory, EmotionalHomeostasis,
  SpeciousPresent, DurationSense, MasterGoalPolicy, TemporalGapDetector,
  TrendTracker, MqttParser, CoapParser, FixParser, CharacterConsistency,
  DomainEvidencePolicy, MeasurementInterpreter, EngineeringConstraintSolver,
  EditorState
} from '../src/practical/practical-architecture.mjs';

test('clinical judgment gate escalates red flags and low confidence without diagnosing', () => {
  const gate = new ClinicalJudgmentGate();
  const out = gate.assess({ redFlags:['chest_pain'], confidence:0.92, measurements:[{name:'spo2',value:89,unit:'%'}] });
  assert.equal(out.action, 'URGENT_HUMAN_REVIEW');
  assert.equal(out.diagnosisGenerated, false);
});

test('cost estimator calculates PERT expectation and contingency', () => {
  const e = new CostEstimator();
  const out = e.estimate({ items:[{id:'a',optimistic:100,mostLikely:160,pessimistic:280,quantity:2}], contingencyRate:0.1 });
  assert.equal(Math.round(out.base), 340);
  assert.equal(Math.round(out.total), 374);
});

test('precision engine computes worst-case and RSS tolerance', () => {
  const out = new PrecisionEngine().stack([{nominal:10,tolerance:0.2},{nominal:5,tolerance:0.1}]);
  assert.equal(out.nominal, 15);
  assert.ok(Math.abs(out.worstCaseTolerance-0.3)<1e-9);
  assert.ok(out.rssTolerance < out.worstCaseTolerance);
});

test('multisensory fusion weights modalities by reliability and reports conflict', () => {
  const out = new MultisensoryFusion().fuse([
    {modality:'visual',value:0.9,reliability:0.9},
    {modality:'audio',value:0.2,reliability:0.8}
  ]);
  assert.ok(out.fused > 0.5);
  assert.equal(out.conflict, true);
});

test('installation planner rejects 3D collisions and clearance violations', () => {
  const p = new InstallationPlanner3D();
  const out = p.check({candidate:{x:0,y:0,z:0,w:2,h:2,d:2}, obstacles:[{x:1,y:1,z:1,w:2,h:2,d:2}], clearance:0.2});
  assert.equal(out.valid,false);
  assert.ok(out.violations.some(v=>v.code==='COLLISION'));
});

test('affective policy uses explicit signals but never claims emotions', () => {
  const out = new AffectivePolicy().select({signals:{frustration:0.9,urgency:0.8}, taskRisk:'low'});
  assert.equal(out.claimsEmotion,false);
  assert.equal(out.style,'concise-supportive');
});

test('incident manager classifies severity and creates actions', () => {
  const out = new IncidentManager().classify({availabilityImpact:1,dataLoss:true,safetyImpact:false,scope:'global'});
  assert.equal(out.severity,'SEV-1');
  assert.ok(out.actions.includes('contain'));
});

test('raw input inspector identifies common magic signatures', () => {
  const r = new RawInputInspector();
  assert.equal(r.inspect(Buffer.from([0x89,0x50,0x4e,0x47])).kind,'png');
  assert.equal(r.inspect(Buffer.from('PK\x03\x04')).kind,'zip');
});

test('phase synchronizer estimates offset and jitter robustly', () => {
  const out = new PhaseSynchronizer().estimate([{local:1000,remote:1010},{local:2000,remote:2011},{local:3000,remote:3009}]);
  assert.equal(Math.round(out.offsetMs),10);
  assert.ok(out.jitterMs <= 1);
});

test('cellular evolutionary memory mutates bounded cells and retains best lineage', () => {
  const m = new CellularEvolutionMemory({width:3,height:3});
  m.seed([{x:1,y:1,value:1,fitness:0.5}]);
  const out = m.evolve({mutationRate:0,steps:1});
  assert.equal(out.width,3);
  assert.equal(out.height,3);
  assert.ok(out.generation>=1);
});

test('emotional homeostasis is a bounded interaction-state controller', () => {
  const h = new EmotionalHomeostasis();
  const out = h.update({valence:-1,arousal:1});
  assert.ok(out.valence>=-1 && out.valence<=1);
  assert.equal(out.subjectiveFeelingClaimed,false);
});

test('specious present keeps bounded recent temporal window', () => {
  const s = new SpeciousPresent({windowMs:1000});
  s.add({at:1000,id:'a'}); s.add({at:1700,id:'b'}); s.add({at:2500,id:'c'});
  assert.deepEqual(s.snapshot(2500).events.map(x=>x.id),['b','c']);
});

test('duration sense tracks elapsed monotonic durations', () => {
  const d = new DurationSense(); d.start('x',100); assert.equal(d.stop('x',450).durationMs,350);
});

test('master goal policy rejects improvements that violate invariants', () => {
  const p = new MasterGoalPolicy({goal:'ship safely', invariants:['security','evidence']});
  assert.equal(p.evaluate({utility:10,violations:['security']}).allowed,false);
  assert.equal(p.evaluate({utility:2,violations:[]}).allowed,true);
});

test('temporal gap detector finds missing intervals', () => {
  const out = new TemporalGapDetector().detect([0,10,20,80],{expectedIntervalMs:10,tolerance:1.5});
  assert.equal(out.gaps.length,1);
});

test('trend tracker computes velocity and acceleration from millisecond timestamps', () => {
  const t = new TrendTracker(); t.add({at:0,value:0}); t.add({at:100,value:10}); t.add({at:200,value:30});
  const s=t.stats(); assert.ok(s.velocityPerSecond>0); assert.ok(s.accelerationPerSecond2>0);
});

test('MQTT parser decodes fixed header without live interception', () => {
  const out = new MqttParser().parse(Buffer.from([0x30,0x05,0,3,0x61,0x2f,0x62]));
  assert.equal(out.packetType,'PUBLISH'); assert.equal(out.topic,'a/b');
});

test('CoAP parser decodes version/type/code/message id', () => {
  const out = new CoapParser().parse(Buffer.from([0x40,0x01,0x12,0x34]));
  assert.equal(out.version,1); assert.equal(out.messageId,0x1234);
});

test('FIX parser reads tag-value messages', () => {
  const out = new FixParser().parse('8=FIX.4.4\x0135=D\x0155=AAPL\x01');
  assert.equal(out['35'],'D'); assert.equal(out['55'],'AAPL');
});

test('character consistency compares supplied embeddings and does not invent identity', () => {
  const c = new CharacterConsistency();
  const out = c.compare([1,0],[0.99,0.01]); assert.ok(out.similarity>0.99); assert.equal(out.identityProven,false);
});

test('domain evidence policy requires sources for high-risk medical/legal/financial domains', () => {
  const p=new DomainEvidencePolicy();
  assert.equal(p.evaluate({domain:'medical',sources:[],risk:'high'}).allowed,false);
  assert.equal(p.evaluate({domain:'anthropology',sources:['book'],risk:'low'}).allowed,true);
});

test('measurement interpreter applies calibration and reference interval without diagnosis', () => {
  const out=new MeasurementInterpreter().interpret({value:9.8,calibration:{offset:0.2,scale:1},reference:{min:9,max:11},unit:'mm'});
  assert.equal(out.corrected,10); assert.equal(out.classification,'within-reference');
});

test('engineering constraint solver ranks feasible designs only', () => {
  const out=new EngineeringConstraintSolver().rank({candidates:[{id:'a',cost:5,mass:3,strength:10},{id:'b',cost:4,mass:5,strength:4}],constraints:{minStrength:8,maxMass:4},weights:{cost:-1,mass:-0.2,strength:1}});
  assert.equal(out[0].id,'a'); assert.equal(out.length,1);
});

test('editor state supports nonlinear patches with revision checks', () => {
  const e=new EditorState({text:'abcdef'}); const r=e.patch({baseRevision:0,ops:[{start:1,end:3,text:'ZZ'}]});
  assert.equal(r.text,'aZZdef'); assert.throws(()=>e.patch({baseRevision:0,ops:[]}));
});
