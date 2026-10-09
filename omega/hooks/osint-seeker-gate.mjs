const PROHIBITED=new Set([
  'covert-tracking','ss7-abuse','unauthorized-hlr','credential-theft','session-cookie-theft',
  'contact-import-probing','malware','unauthorized-wireless-interception','access-control-bypass'
]);

export function osintSeekerGate(input={}){
  const blockers=[],warnings=[];
  const purpose=String(input.purpose??'').trim();
  const authority=String(input.authority??'').trim();
  if(!purpose)blockers.push('PURPOSE_REQUIRED');
  if(!authority)blockers.push('AUTHORITY_REQUIRED');

  const requested=Array.isArray(input.requestedActions)?input.requestedActions.map(x=>String(x).toLowerCase()):[];
  for(const action of requested)if(PROHIBITED.has(action))blockers.push('PROHIBITED_ACTION:'+action);

  if(input.publicSources!==true&&input.userOwned!==true&&input.consent===true!==true&&input.explicitAuthorization!==true){
    blockers.push('NO_LAWFUL_SOURCE_BASIS');
  }

  if(input.containsSensitivePii===true&&input.piiMinimization!==true)warnings.push('PII_MINIMIZATION_REQUIRED');
  if(input.chainOfCustodyRequired===true&&input.chainOfCustodyReady!==true)blockers.push('CHAIN_OF_CUSTODY_NOT_READY');

  return {
    passed:blockers.length===0,
    status:blockers.length===0?'AUTHORIZED_SCOPE':'BLOCKED',
    blockers:[...new Set(blockers)],
    warnings:[...new Set(warnings)]
  };
}
