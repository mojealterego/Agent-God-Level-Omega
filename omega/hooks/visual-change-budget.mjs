import {assessVisualChangeBudget} from '../tools/visual-architect/change-budget.mjs';

export function visualPreflight(input={}){
  const result=assessVisualChangeBudget(input);
  return {
    ...result,
    status:result.passed?'CHANGE_BUDGET_ACCEPTED':'CHANGE_BUDGET_BLOCKED'
  };
}

export function visualAcceptanceGate({changeBudget,validation={}}={}){
  const blockers=[];
  if(changeBudget?.passed!==true)blockers.push(...(changeBudget?.violations??['CHANGE_BUDGET_NOT_PASSED']));
  if(validation?.observed!==true)blockers.push('RESULT_NOT_OBSERVED');
  for(const failure of Array.isArray(validation?.failures)?validation.failures:[])blockers.push('VISUAL_FAILURE:'+String(failure));
  return {passed:blockers.length===0,status:blockers.length===0?'ACCEPTED':'CORRECTION_REQUIRED',blockers:[...new Set(blockers)]};
}
