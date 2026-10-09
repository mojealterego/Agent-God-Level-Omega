import {validateTraceLifecycle,toolOutputTripwireGate,agentRunAcceptance} from '../tools/openai-agents/trace-guardrail.mjs';

export function openAIAgentPreflight({traceRequired=false,trace={},guardrail={}}={}){
  const guard=toolOutputTripwireGate(guardrail);
  const blockers=[...guard.blockers];
  let traceResult=null;
  if(traceRequired){
    traceResult=validateTraceLifecycle(trace);
    blockers.push(...traceResult.blockers);
  }
  return {passed:blockers.length===0,blockers:[...new Set(blockers)],trace:traceResult,guardrail:guard};
}

export function openAIAgentFinalGate(input={}){
  return agentRunAcceptance(input);
}
