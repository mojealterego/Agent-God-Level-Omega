const STATES=new Set(['FACT','ASSUMPTION','ESTIMATE','UNKNOWN','TO_VERIFY','EXECUTED','VERIFIED']);

export function grantPreflight({program={},evidence=[],data=[]}={}){
  const blockers=[],warnings=[];
  if(!String(program.id??program.name??'').trim())blockers.push('PROGRAM_NOT_IDENTIFIED');
  const official=evidence.filter(x=>x?.authority==='official'&&x?.verified===true);
  if(official.length===0)blockers.push('NO_VERIFIED_OFFICIAL_PROGRAMME_EVIDENCE');
  for(const item of data){
    if(!STATES.has(item?.state))blockers.push('INVALID_DATA_STATE:'+String(item?.id??'unknown'));
    if(item?.critical===true&&['UNKNOWN','TO_VERIFY'].includes(item?.state))blockers.push('CRITICAL_DATA_UNRESOLVED:'+String(item?.id??'unknown'));
    if(item?.state==='ASSUMPTION'||item?.state==='ESTIMATE')warnings.push('MODELLED_NOT_FACT:'+String(item?.id??'unknown'));
  }
  return {passed:blockers.length===0,blockers:[...new Set(blockers)],warnings:[...new Set(warnings)],officialEvidenceIds:official.map(x=>x.id).filter(Boolean)};
}

export function grantFinalGate({preflight,criteria=[],budgetAudit=null,consistency=null,requiredAttachments=[]}={}){
  const blockers=[];
  if(preflight?.passed!==true)blockers.push(...(preflight?.blockers??['PREFLIGHT_NOT_PASSED']));
  for(const c of criteria){
    if(c?.mandatory===true&&c?.status!=='SATISFIED')blockers.push('MANDATORY_CRITERION:'+String(c?.id??'unknown'));
    if(c?.status==='TO_VERIFY')blockers.push('CRITERION_TO_VERIFY:'+String(c?.id??'unknown'));
  }
  if(budgetAudit&&budgetAudit.passed!==true)blockers.push('BUDGET_AUDIT_FAILED');
  if(consistency&&consistency.passed!==true)blockers.push('CROSS_CONSISTENCY_FAILED');
  for(const a of requiredAttachments)if(a?.required===true&&a?.present!==true)blockers.push('MISSING_ATTACHMENT:'+String(a?.id??a?.name??'unknown'));
  return {passed:blockers.length===0,status:blockers.length===0?'READY_FOR_HUMAN_REVIEW':'BLOCKED',blockers:[...new Set(blockers)]};
}
