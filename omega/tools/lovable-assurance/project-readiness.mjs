const uniq=x=>[...new Set((Array.isArray(x)?x:[]).map(v=>String(v).trim()).filter(Boolean))];

export function classifySecretPlacement({name='',sensitive=true,placement=''}={}){
  const key=String(name).trim();
  const where=String(placement).toUpperCase();
  const vite=key.startsWith('VITE_');
  const blockers=[];
  if(vite&&sensitive===true)blockers.push('VITE_VALUE_CANNOT_BE_PRIVATE_SECRET');
  if(sensitive===true&&['CLIENT','BROWSER','FRONTEND','SOURCE'].includes(where))blockers.push('PRIVATE_SECRET_EXPOSED_TO_CLIENT');
  if(!vite&&sensitive===true&&where==='ENV_PUBLIC')blockers.push('PRIVATE_SECRET_IN_PUBLIC_ENV');
  return {name:key,vite,sensitive:sensitive===true,placement:where||null,passed:blockers.length===0,blockers};
}

export function selectVerificationPlan({surface='',regressionRequired=true}={}){
  const s=String(surface).toLowerCase();
  if(['browser','user-flow','routing','auth-flow','checkout'].includes(s))
    return {primary:'BROWSER_TEST',evidence:['ui','console','network'],regression:regressionRequired?'FRONTEND_OR_E2E_TEST':null};
  if(['ui','component','frontend-rule','rendering'].includes(s))
    return {primary:'FRONTEND_TEST',evidence:['assertions','test-output'],regression:regressionRequired?'FRONTEND_TEST':null};
  if(['edge','backend','api','edge-function'].includes(s))
    return {primary:'DIRECT_EDGE_CALL',evidence:['request','response','logs'],regression:regressionRequired?'EDGE_TEST':null};
  return {primary:'TARGETED_TEST',evidence:['observed-result'],regression:regressionRequired?'REGRESSION_TEST':null};
}

export function securityReleaseGate(input={}){
  const blockers=[];
  const critical=Number(input.criticalFindings??0);
  if(!Number.isFinite(critical)||critical<0)throw new Error('criticalFindings must be >= 0');
  if(input.securityEvidenceCurrent!==true)blockers.push('SECURITY_EVIDENCE_STALE_OR_MISSING');
  if(critical>0)blockers.push('UNRESOLVED_CRITICAL_SECURITY_FINDINGS');
  if(input.rlsRelevant===true&&input.rlsReviewed!==true)blockers.push('RLS_REVIEW_REQUIRED');
  if(input.authChanged===true&&input.authVerified!==true)blockers.push('AUTHORIZATION_VERIFICATION_REQUIRED');
  if(input.dependenciesChanged===true&&input.dependencyAuditCurrent!==true)blockers.push('DEPENDENCY_AUDIT_REQUIRED');
  if(input.secretExposureDetected===true)blockers.push('SECRET_EXPOSURE');
  return {passed:blockers.length===0,status:blockers.length===0?'RELEASE_SECURITY_READY':'BLOCKED',blockers};
}

export function revertImpact({codeRevert=false,databaseChanged=false,databaseRollbackVerified=false}={}){
  const blockers=[];
  if(codeRevert&&databaseChanged&&databaseRollbackVerified!==true)blockers.push('CODE_REVERT_DOES_NOT_ROLL_BACK_DATABASE');
  return {passed:blockers.length===0,codeRevert,databaseChanged,databaseRollbackVerified,blockers};
}

export function designSystemAdherence(input={}){
  const violations=uniq(input.violations);
  const blockers=[...violations];
  if(input.attached===true&&input.schemaPresent!==true)blockers.push('DESIGN_SYSTEM_SCHEMA_MISSING');
  if(input.dependenciesVerified!==true)blockers.push('DESIGN_SYSTEM_DEPENDENCIES_UNVERIFIED');
  if(input.setupVerified!==true)blockers.push('DESIGN_SYSTEM_SETUP_UNVERIFIED');
  if(input.managedFilesEditedLocally===true)blockers.push('MANAGED_DESIGN_SYSTEM_FILES_EDITED_LOCALLY');
  return {passed:blockers.length===0,blockers:[...new Set(blockers)]};
}
