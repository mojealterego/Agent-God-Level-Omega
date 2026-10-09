import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifySecretPlacement,
  selectVerificationPlan,
  securityReleaseGate,
  revertImpact,
  designSystemAdherence
} from '../../../tools/lovable-assurance/project-readiness.mjs';
import {lovablePreflight,lovableReleaseGate} from '../../../hooks/lovable-release-gate.mjs';
import {
  validateTraceLifecycle,
  toolOutputTripwireGate,
  agentRunAcceptance
} from '../../../tools/openai-agents/trace-guardrail.mjs';
import {openAIAgentPreflight,openAIAgentFinalGate} from '../../../hooks/openai-agent-tripwire.mjs';

test('Lovable private secrets are blocked from browser placement',()=>{
  const result=classifySecretPlacement({name:'OPENAI_API_KEY',sensitive:true,placement:'browser'});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('PRIVATE_SECRET_EXPOSED_TO_CLIENT'));
});

test('Lovable VITE values cannot be treated as private secrets',()=>{
  const result=classifySecretPlacement({name:'VITE_PUBLIC_URL',sensitive:true,placement:'frontend'});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('VITE_VALUE_CANNOT_BE_PRIVATE_SECRET'));
});

test('Lovable verification router picks direct edge call for backend behavior',()=>{
  const result=selectVerificationPlan({surface:'edge-function',regressionRequired:true});
  assert.equal(result.primary,'DIRECT_EDGE_CALL');
  assert.equal(result.regression,'EDGE_TEST');
});

test('Lovable release security blocks unresolved critical findings',()=>{
  const result=securityReleaseGate({
    securityEvidenceCurrent:true,
    criticalFindings:1,
    rlsRelevant:true,
    rlsReviewed:true
  });
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('UNRESOLVED_CRITICAL_SECURITY_FINDINGS'));
});

test('Lovable code revert does not imply database rollback',()=>{
  const result=revertImpact({codeRevert:true,databaseChanged:true,databaseRollbackVerified:false});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('CODE_REVERT_DOES_NOT_ROLL_BACK_DATABASE'));
});

test('Lovable design system gate detects managed local edits',()=>{
  const result=designSystemAdherence({
    attached:true,
    schemaPresent:true,
    dependenciesVerified:true,
    setupVerified:true,
    managedFilesEditedLocally:true
  });
  assert.equal(result.passed,false);
});

test('Lovable final gate requires observed verification and build',()=>{
  const preflight=lovablePreflight({
    security:{securityEvidenceCurrent:true,criticalFindings:0},
    verification:{surface:'ui'}
  });
  assert.equal(preflight.passed,true);
  const result=lovableReleaseGate({preflight,verificationObserved:true,buildObserved:false});
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('BUILD_NOT_OBSERVED'));
});

test('OpenAI trace lifecycle requires flush when processors exist',()=>{
  const result=validateTraceLifecycle({
    traceId:'trace-1',
    spanId:'span-1',
    traceState:'ENDED',
    spanState:'ENDED',
    processorCount:1,
    flushed:false
  });
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('TRACE_PROCESSORS_NOT_FLUSHED'));
});

test('OpenAI externally originated lifecycle preserves timestamps',()=>{
  const result=validateTraceLifecycle({
    traceId:'trace-1',
    spanId:'span-1',
    traceState:'DISPATCHED',
    spanState:'DISPATCHED',
    externallyOriginated:true,
    timestampsPreserved:false,
    processorCount:0
  });
  assert.equal(result.passed,false);
  assert.ok(result.blockers.includes('EXTERNAL_TIMESTAMPS_MUTATED'));
});

test('OpenAI tool output tripwire is blocking',()=>{
  const result=toolOutputTripwireGate({
    errorName:'ToolOutputGuardrailTripwireTriggered',
    resultPresent:true,
    statePresent:true
  });
  assert.equal(result.passed,false);
  assert.equal(result.status,'BLOCKED_BY_TOOL_OUTPUT_GUARDRAIL');
  assert.equal(result.preserveRunState,true);
});

test('OpenAI run acceptance requires observed execution and clean guards',()=>{
  const result=agentRunAcceptance({
    trace:{traceId:'t',spanId:'s',traceState:'ENDED',spanState:'ENDED',processorCount:0},
    guardrail:{triggered:false},
    run:{executed:true,resultObserved:true}
  });
  assert.equal(result.passed,true);
  assert.equal(result.status,'VERIFIED');
});

test('OpenAI hooks preserve blocking semantics',()=>{
  const pre=openAIAgentPreflight({
    traceRequired:false,
    guardrail:{triggered:true,resultPresent:true}
  });
  assert.equal(pre.passed,false);
  const final=openAIAgentFinalGate({
    trace:{traceId:'t',spanId:'s',traceState:'ENDED',spanState:'ENDED',processorCount:0},
    guardrail:{triggered:true,resultPresent:true},
    run:{executed:true,resultObserved:true}
  });
  assert.equal(final.passed,false);
});
