const TERMINAL_SPAN_STATES=new Set(['ENDED','DISPATCHED']);
const TERMINAL_TRACE_STATES=new Set(['ENDED','DISPATCHED']);

export function validateTraceLifecycle(input={}){
  const blockers=[];
  const traceId=String(input.traceId??'').trim();
  const spanId=String(input.spanId??'').trim();
  const traceState=String(input.traceState??'').toUpperCase();
  const spanState=String(input.spanState??'').toUpperCase();
  if(!traceId)blockers.push('TRACE_ID_MISSING');
  if(!spanId)blockers.push('SPAN_ID_MISSING');
  if(!TERMINAL_TRACE_STATES.has(traceState))blockers.push('TRACE_NOT_TERMINAL');
  if(!TERMINAL_SPAN_STATES.has(spanState))blockers.push('SPAN_NOT_TERMINAL');
  if(input.externallyOriginated===true&&input.timestampsPreserved!==true)blockers.push('EXTERNAL_TIMESTAMPS_MUTATED');
  if(input.processorCount>0&&input.flushRequired!==false&&input.flushed!==true)blockers.push('TRACE_PROCESSORS_NOT_FLUSHED');
  if(input.shutdownRequired===true&&input.shutdownComplete!==true)blockers.push('TRACE_PROVIDER_NOT_SHUT_DOWN');
  return {passed:blockers.length===0,blockers:[...new Set(blockers)],traceId:traceId||null,spanId:spanId||null};
}

export function toolOutputTripwireGate(input={}){
  const triggered=input.triggered===true||input.errorName==='ToolOutputGuardrailTripwireTriggered';
  const blockers=[];
  if(triggered)blockers.push('TOOL_OUTPUT_GUARDRAIL_TRIPWIRE');
  if(triggered&&input.resultPresent!==true)blockers.push('GUARDRAIL_RESULT_MISSING');
  return {
    passed:blockers.length===0,
    triggered,
    status:triggered?'BLOCKED_BY_TOOL_OUTPUT_GUARDRAIL':'PASS',
    blockers,
    preserveRunState:triggered&&input.statePresent===true
  };
}

export function agentRunAcceptance({trace={},guardrail={},run={}}={}){
  const traceGate=validateTraceLifecycle(trace);
  const guardrailGate=toolOutputTripwireGate(guardrail);
  const blockers=[...traceGate.blockers,...guardrailGate.blockers];
  if(run.executed!==true)blockers.push('RUN_NOT_EXECUTED');
  if(run.resultObserved!==true)blockers.push('RUN_RESULT_NOT_OBSERVED');
  return {
    passed:blockers.length===0,
    status:blockers.length===0?'VERIFIED':'BLOCKED',
    blockers:[...new Set(blockers)],
    trace:traceGate,
    guardrail:guardrailGate
  };
}
