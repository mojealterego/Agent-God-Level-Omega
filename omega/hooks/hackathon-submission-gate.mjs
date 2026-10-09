export function hackathonSubmissionGate(input={}){
  const blockers=[],warnings=[];
  if(input.officialRulesVerified!==true)blockers.push('OFFICIAL_RULES_NOT_VERIFIED');
  if(input.eligibilityVerified!==true)blockers.push('ELIGIBILITY_NOT_VERIFIED');
  if(input.buildWindowVerified!==true)blockers.push('BUILD_WINDOW_NOT_VERIFIED');
  if(input.freshCodeAuditPassed!==true)blockers.push('FRESH_CODE_AUDIT_FAILED');
  if(input.prototypeVerified!==true)blockers.push('PROTOTYPE_NOT_VERIFIED');
  if(input.requiredArtifactsReady!==true)blockers.push('SUBMISSION_ARTIFACTS_INCOMPLETE');
  if(input.deadlineConflict===true&&input.conservativeDeadlineApplied!==true)warnings.push('DEADLINE_CONFLICT_UNRESOLVED');
  if(input.beforeDeadline!==true)blockers.push('DEADLINE_FAILED');
  return {passed:blockers.length===0&&warnings.length===0,status:blockers.length===0&&warnings.length===0?'READY':'BLOCKED',blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]};
}
