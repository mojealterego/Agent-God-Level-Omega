const text=v=>String(v??'').trim();

export function appForgeGate(input={}){
  const blockers=[],warnings=[];
  if(!text(input.targetUser))blockers.push('TARGET_USER_REQUIRED');
  if(!text(input.problem))blockers.push('PROBLEM_REQUIRED');
  if(Number(input.evidenceCount??0)<1)blockers.push('EVIDENCE_REQUIRED');
  if(input.duplicateChecked!==true)blockers.push('DUPLICATE_CHECK_REQUIRED');
  if(!Array.isArray(input.acceptanceCriteria)||input.acceptanceCriteria.length===0)blockers.push('ACCEPTANCE_CRITERIA_REQUIRED');
  if(input.scopeBounded!==true)blockers.push('SCOPE_NOT_BOUNDED');
  if(input.marketGapConfirmed!==true)warnings.push('MARKET_GAP_NOT_CONFIRMED');
  return {passed:blockers.length===0,status:blockers.length?'BLOCKED':'READY',blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]};
}
