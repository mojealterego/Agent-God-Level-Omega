const RUN_ITEM_TYPES=new Set([
  'input_item',
  'message_output_item',
  'tool_call_item',
  'tool_approval_item',
  'reasoning_item',
  'handoff_call_item',
  'handoff_output_item',
  'raw_model_stream_event'
]);

const normString=value=>String(value??'').trim();
const asArray=value=>Array.isArray(value)?value:[];

export function validateAdmittedTurnAccounting(input={}){
  const blockers=[];
  const currentTurn=Number(input.currentTurn??0);
  const resumedFromTurn=Number(input.resumedFromTurn??0);
  const maxTurns=input.maxTurns==null?null:Number(input.maxTurns);

  if(!Number.isInteger(currentTurn)||currentTurn<0)blockers.push('CURRENT_TURN_INVALID');
  if(!Number.isInteger(resumedFromTurn)||resumedFromTurn<0)blockers.push('RESUMED_TURN_INVALID');
  if(maxTurns!==null&&(!Number.isInteger(maxTurns)||maxTurns<0))blockers.push('MAX_TURNS_INVALID');

  if(blockers.length===0){
    if(currentTurn<resumedFromTurn)blockers.push('CURRENT_TURN_BEHIND_RESUMED_STATE');
    if(maxTurns!==null&&currentTurn>maxTurns)blockers.push('CURRENT_TURN_EXCEEDS_MAX_TURNS');
    if(input.blockingInputGuardrail===true&&input.modelRequestStarted!==true&&currentTurn!==resumedFromTurn){
      blockers.push('TURN_COUNTED_BEFORE_BLOCKING_INPUT_GUARDRAIL');
    }
    if(input.maxTurnsBoundaryHit===true&&input.modelRequestStarted!==true&&currentTurn!==resumedFromTurn){
      blockers.push('TURN_COUNTED_PAST_MAX_TURNS_BOUNDARY');
    }
    if(input.turnAdmitted===true&&input.modelRequestStarted!==true){
      blockers.push('ADMITTED_TURN_WITHOUT_MODEL_REQUEST');
    }
  }

  return {
    passed:blockers.length===0,
    currentTurn,
    resumedFromTurn,
    maxTurns,
    blockers:[...new Set(blockers)]
  };
}

export function validateStreamCompletion(input={}){
  const blockers=[];
  const streaming=input.streaming===true;

  if(input.cancelled===true)blockers.push('RUN_STREAM_CANCELLED');
  if(input.errorPresent===true||input.error!=null)blockers.push('RUN_STREAM_ERROR');

  if(streaming){
    const settled=input.completedPromiseResolved===true||input.streamConsumed===true;
    if(!settled)blockers.push('STREAM_NOT_COMPLETED');
  }

  if(input.finalOutputRequired!==false&&input.finalOutputObserved!==true){
    blockers.push('FINAL_OUTPUT_NOT_OBSERVED');
  }

  return {
    passed:blockers.length===0,
    streaming,
    completed:streaming
      ? input.completedPromiseResolved===true||input.streamConsumed===true
      : input.completed!==false,
    blockers:[...new Set(blockers)]
  };
}

export function validateRunItem(item={}){
  const type=normString(item.type);
  const blockers=[];
  if(!RUN_ITEM_TYPES.has(type))blockers.push('UNKNOWN_RUN_ITEM_TYPE');

  if(['tool_call_item','tool_approval_item','handoff_call_item','handoff_output_item'].includes(type)){
    if(!normString(item.callId))blockers.push('CALL_ID_MISSING');
  }

  if(type==='tool_approval_item'){
    if(!normString(item.name)&&!normString(item.toolName))blockers.push('TOOL_NAME_MISSING');
  }

  if(type==='message_output_item'){
    const status=normString(item.status).toLowerCase();
    if(!['completed','in_progress','incomplete'].includes(status))blockers.push('MESSAGE_STATUS_INVALID');
  }

  if(type==='raw_model_stream_event'&&!item.dataPresent)blockers.push('RAW_MODEL_STREAM_DATA_MISSING');

  return {passed:blockers.length===0,type:type||null,blockers:[...new Set(blockers)]};
}

export function toolApprovalGate({interruptions=[],decisions=[]}={}){
  const blockers=[];
  const decisionMap=new Map();

  for(const decision of asArray(decisions)){
    const key=normString(decision.callId||decision.functionToolStateKey||decision.name);
    if(!key)continue;
    decisionMap.set(key,decision);
  }

  const resolved=[];
  const unresolved=[];
  const denied=[];

  for(const item of asArray(interruptions)){
    const key=normString(item.callId||item.functionToolStateKey||item.name||item.toolName);
    if(!key){
      blockers.push('TOOL_APPROVAL_IDENTITY_MISSING');
      unresolved.push(null);
      continue;
    }
    const decision=decisionMap.get(key);
    if(!decision||decision.observed!==true){
      blockers.push('TOOL_APPROVAL_UNRESOLVED:'+key);
      unresolved.push(key);
      continue;
    }
    resolved.push(key);
    if(decision.approved!==true)denied.push(key);
  }

  return {
    passed:blockers.length===0,
    readyToResume:blockers.length===0,
    resolved:[...new Set(resolved)],
    unresolved:[...new Set(unresolved)],
    denied:[...new Set(denied)],
    blockers:[...new Set(blockers)]
  };
}

export function validateHandoffPair({callItem={},outputItem={}}={}){
  const blockers=[];
  const callId=normString(callItem.callId);
  const outputCallId=normString(outputItem.callId);
  const sourceAgent=normString(outputItem.sourceAgent);
  const targetAgent=normString(outputItem.targetAgent);

  if(!callId)blockers.push('HANDOFF_CALL_ID_MISSING');
  if(!outputCallId)blockers.push('HANDOFF_OUTPUT_CALL_ID_MISSING');
  if(callId&&outputCallId&&callId!==outputCallId)blockers.push('HANDOFF_CALL_ID_MISMATCH');
  if(normString(callItem.type)&&callItem.type!=='handoff_call_item')blockers.push('HANDOFF_CALL_TYPE_INVALID');
  if(normString(outputItem.type)&&outputItem.type!=='handoff_output_item')blockers.push('HANDOFF_OUTPUT_TYPE_INVALID');
  if(!sourceAgent)blockers.push('HANDOFF_SOURCE_AGENT_MISSING');
  if(!targetAgent)blockers.push('HANDOFF_TARGET_AGENT_MISSING');
  if(sourceAgent&&targetAgent&&sourceAgent===targetAgent)blockers.push('HANDOFF_SOURCE_EQUALS_TARGET');
  if(outputItem.status&&outputItem.status!=='completed')blockers.push('HANDOFF_OUTPUT_NOT_COMPLETED');

  return {
    passed:blockers.length===0,
    callId:callId||outputCallId||null,
    sourceAgent:sourceAgent||null,
    targetAgent:targetAgent||null,
    blockers:[...new Set(blockers)]
  };
}

export function runnerStateGate(input={}){
  const turns=validateAdmittedTurnAccounting(input.turns??{});
  const stream=validateStreamCompletion(input.stream??{});
  const approvals=toolApprovalGate(input.approvals??{});
  const handoffs=asArray(input.handoffs).map(validateHandoffPair);
  const items=asArray(input.items).map(validateRunItem);

  const blockers=[
    ...turns.blockers,
    ...stream.blockers,
    ...approvals.blockers,
    ...handoffs.flatMap(x=>x.blockers),
    ...items.flatMap(x=>x.blockers)
  ];

  if(input.maxTurnsExceeded===true)blockers.push('MAX_TURNS_EXCEEDED');
  if(input.guardrailTripwireTriggered===true)blockers.push('GUARDRAIL_TRIPWIRE_TRIGGERED');
  if(input.runErrorPresent===true)blockers.push('RUN_ERROR_PRESENT');

  return {
    passed:blockers.length===0,
    status:blockers.length===0?'RUN_STATE_ACCEPTED':'RUN_STATE_BLOCKED',
    blockers:[...new Set(blockers)],
    turns,
    stream,
    approvals,
    handoffs,
    items
  };
}
