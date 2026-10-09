import {validateProjectState,detectRetryLoop,completionState} from '../tools/orchestration-state/claim-state.mjs';

export function orchestrationStepGate({projectState={},history=[]}={}){
  const state=validateProjectState(projectState);
  const retry=detectRetryLoop(history);
  const blockers=[...state.blockers];
  if(retry.strategyChangeRequired)blockers.push('REPEATED_FAILURE_REQUIRES_STRATEGY_CHANGE');
  return {passed:blockers.length===0,blockers:[...new Set(blockers)],retry};
}

export function orchestrationFinalGate(input={}){
  const project=validateProjectState(input.projectState??{});
  const completion=completionState(input.completion??{});
  const blockers=[...project.blockers];
  if(!completion.completed)blockers.push('NOT_VERIFIED');
  return {passed:blockers.length===0,status:blockers.length===0?'COMPLETED':'BLOCKED',blockers:[...new Set(blockers)],completion};
}
