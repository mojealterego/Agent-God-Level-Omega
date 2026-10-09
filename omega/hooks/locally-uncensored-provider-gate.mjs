export function locallyUncensoredProviderGate(input={}){
  const blockers=[],warnings=[];
  if(!String(input.operation??'').trim())blockers.push('OPERATION_REQUIRED');
  if(!String(input.provider??'').trim()&&input.localExecution!==true)blockers.push('PROVIDER_REQUIRED');
  if(input.localExecution!==true&&input.authConfigured!==true)blockers.push('PROVIDER_AUTH_NOT_CONFIGURED');
  if(input.capabilityVerified!==true)blockers.push('CAPABILITY_NOT_VERIFIED');
  if(input.accessControlBypassRequested===true)blockers.push('ACCESS_CONTROL_BYPASS_NOT_ALLOWED');
  if(input.sessionMaterialFromThirdParty===true)blockers.push('THIRD_PARTY_SESSION_MATERIAL_NOT_ALLOWED');
  if(input.captchaBypassRequested===true)blockers.push('CAPTCHA_BYPASS_NOT_ALLOWED');
  if(input.policyEvasionRequested===true)blockers.push('POLICY_EVASION_NOT_ALLOWED');
  if(input.rateLimited===true)warnings.push('USE_BOUNDED_BACKOFF');
  return {
    passed:blockers.length===0,
    status:blockers.length===0?'READY':'BLOCKED',
    blockers:[...new Set(blockers)],
    warnings:[...new Set(warnings)]
  };
}
