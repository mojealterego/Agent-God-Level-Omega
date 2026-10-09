import {
  validateAdmittedTurnAccounting,
  validateStreamCompletion,
  toolApprovalGate,
  validateHandoffPair,
  runnerStateGate
} from '../tools/openai-agents/run-state.mjs';

export function openAIAgentRunPreflight({turns={},approvals={},handoffs=[]}={}){
  const turnGate=validateAdmittedTurnAccounting(turns);
  const approvalGate=toolApprovalGate(approvals);
  const handoffGates=(Array.isArray(handoffs)?handoffs:[]).map(validateHandoffPair);
  const blockers=[
    ...turnGate.blockers,
    ...approvalGate.blockers,
    ...handoffGates.flatMap(x=>x.blockers)
  ];
  return {
    passed:blockers.length===0,
    status:blockers.length===0?'READY_TO_RUN_OR_RESUME':'BLOCKED',
    blockers:[...new Set(blockers)],
    turns:turnGate,
    approvals:approvalGate,
    handoffs:handoffGates
  };
}

export function openAIAgentStreamGate(input={}){
  return validateStreamCompletion(input);
}

export function openAIAgentRunFinalGate(input={}){
  return runnerStateGate(input);
}
