export function dgmEvolutionGate(input={}){
  const blockers=[],warnings=[];
  if(!String(input.baselineCommit??'').trim())blockers.push('BASELINE_COMMIT_REQUIRED');
  if(!Array.isArray(input.acceptanceCriteria)||input.acceptanceCriteria.length===0)blockers.push('ACCEPTANCE_CRITERIA_REQUIRED');
  if(!String(input.patchPlan??'').trim())blockers.push('PATCH_PLAN_REQUIRED');
  if(!String(input.rollbackPlan??'').trim())blockers.push('ROLLBACK_PLAN_REQUIRED');
  if(input.sandboxed!==true)blockers.push('SANDBOX_EXECUTION_REQUIRED');
  if(input.testsPassed!==true)blockers.push('TESTS_NOT_PASSED');
  if(input.regressionPassed!==true)blockers.push('REGRESSION_GATE_FAILED');
  if(input.securityPassed!==true)blockers.push('SECURITY_GATE_FAILED');
  if(input.provenanceVerified!==true)blockers.push('PROVENANCE_NOT_VERIFIED');
  if(input.requiresHumanApproval!==false&&input.humanApproved!==true)blockers.push('HUMAN_APPROVAL_REQUIRED');
  if(Number(input.changedFiles??0)>Number(input.changeBudget??50))warnings.push('CHANGE_BUDGET_EXCEEDED');
  return {
    passed:blockers.length===0&&warnings.length===0,
    status:blockers.length===0&&warnings.length===0?'APPROVED_TO_LAND':'BLOCKED',
    blockers:[...new Set(blockers)],
    warnings:[...new Set(warnings)]
  };
}
