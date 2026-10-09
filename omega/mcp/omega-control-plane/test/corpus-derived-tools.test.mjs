import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeInvariantModel,
  assessCounterexample,
  architectureDecisionScore
} from '../../../tools/omni-imandra/invariant-model.mjs';
import {omniImandraPreflight,omniImandraCounterexampleGate} from '../../../hooks/omni-imandra-evidence-gate.mjs';
import {assessVisualChangeBudget} from '../../../tools/visual-architect/change-budget.mjs';
import {visualPreflight,visualAcceptanceGate} from '../../../hooks/visual-change-budget.mjs';
import {validateProjectState,detectRetryLoop,completionState} from '../../../tools/orchestration-state/claim-state.mjs';
import {orchestrationStepGate,orchestrationFinalGate} from '../../../hooks/orchestration-anti-loop.mjs';

test('Omni/Imandra model becomes complete with evidence and invariants',()=>{
  const result=normalizeInvariantModel({
    name:'release',
    states:['draft','verified'],
    inputs:['artifact'],
    transitions:['draft->verified'],
    invariants:['verified requires evidence'],
    preconditions:['artifact exists'],
    postconditions:['verification recorded'],
    forbiddenStates:['draft'],
    evidenceIds:['ev-1']
  });
  assert.equal(result.complete,true);
  assert.deepEqual(result.issues,[]);
});

test('Observed counterexample forces model revision',()=>{
  const result=assessCounterexample({
    model:{states:['s'],transitions:['s->s'],invariants:['x'],evidenceIds:['ev']},
    counterexample:{observed:true,violates:['x'],evidenceId:'ce-1'}
  });
  assert.equal(result.accepted,true);
  assert.equal(result.disposition,'REVISE_MODEL');
});

test('Architecture score rewards value and reversibility over complexity and risk',()=>{
  const result=architectureDecisionScore({value:5,maintainability:4,complexity:2,risk:1,reversibility:4});
  assert.equal(result.recommended,true);
  assert.ok(result.total>0);
});

test('Omni evidence gate blocks unresolved critical claims',()=>{
  const result=omniImandraPreflight({
    model:{states:['s'],transitions:['s->s'],invariants:['x'],evidenceIds:['ev']},
    claims:[{id:'critical',critical:true,state:'UNKNOWN'}]
  });
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('CRITICAL_CLAIM_UNRESOLVED:critical'));
});

test('Counterexample gate blocks disproven model',()=>{
  const result=omniImandraCounterexampleGate({
    model:{states:['s'],transitions:['s->s'],invariants:['x'],evidenceIds:['ev']},
    counterexamples:[{observed:true,violates:['x'],evidenceId:'ce'}]
  });
  assert.equal(result.passed,false);
  assert.equal(result.status,'MODEL_REVISION_REQUIRED');
});

test('Visual change budget rejects drift outside requested local scope',()=>{
  const result=assessVisualChangeBudget({
    locked:['identity','text'],
    requestedChanges:['background'],
    derivedChanges:['identity'],
    scope:'LOCAL',
    globalRegeneration:true,
    subjectCountChanged:true,
    subjectCountExplicitlyRequested:false
  });
  assert.equal(result.passed,false);
  assert.ok(result.violations.includes('DERIVED_CHANGE_TOUCHES_LOCK:identity'));
  assert.ok(result.violations.includes('GLOBAL_REGEN_EXCEEDS_CHANGE_BUDGET'));
  assert.ok(result.violations.includes('SUBJECT_COUNT_DRIFT'));
});

test('Visual acceptance requires observed validation',()=>{
  const preflight=visualPreflight({locked:['identity'],requestedChanges:['background'],scope:'LOCAL'});
  assert.equal(preflight.passed,true);
  const gate=visualAcceptanceGate({changeBudget:preflight,validation:{observed:false,failures:[]}});
  assert.equal(gate.passed,false);
  assert.ok(gate.blockers.includes('RESULT_NOT_OBSERVED'));
});

test('MASTER_OS anti-loop gate requires strategy change after repeated identical failure',()=>{
  const history=[
    {action:'deploy',error:'timeout',target:'service'},
    {action:'deploy',error:'timeout',target:'service'},
    {action:'deploy',error:'timeout',target:'service'}
  ];
  const retry=detectRetryLoop(history);
  assert.equal(retry.strategyChangeRequired,true);
  const gate=orchestrationStepGate({projectState:{claims:[],requirements:[]},history});
  assert.equal(gate.passed,false);
  assert.ok(gate.blockers.includes('REPEATED_FAILURE_REQUIRES_STRATEGY_CHANGE'));
});

test('MASTER_OS completion distinguishes planned from verified',()=>{
  assert.equal(completionState({planned:true}).completed,false);
  assert.equal(completionState({planned:true,implemented:true,executed:true,verified:true}).completed,true);
  const project=validateProjectState({
    claims:[{id:'fact',state:'VERIFIED',critical:true}],
    requirements:[{id:'r1',status:'SATISFIED',required:true}]
  });
  assert.equal(project.passed,true);
  const gate=orchestrationFinalGate({
    projectState:{
      claims:[{id:'fact',state:'VERIFIED',critical:true}],
      requirements:[{id:'r1',status:'SATISFIED',required:true}]
    },
    completion:{planned:true,implemented:true,executed:true,verified:true}
  });
  assert.equal(gate.passed,true);
});
