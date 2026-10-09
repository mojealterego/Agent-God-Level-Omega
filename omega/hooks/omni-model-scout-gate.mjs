const text=v=>String(v??'').trim();

export function omniModelScoutGate(input={}){
  const operation=text(input.operation||'discover').toLowerCase();
  const blockers=[],warnings=[];
  if(!['discover','acquire','mount'].includes(operation))blockers.push('UNSUPPORTED_OPERATION');
  if(operation==='acquire'||operation==='mount'){
    if(input.explicitApproval!==true)blockers.push('EXPLICIT_APPROVAL_REQUIRED');
    if(input.sourceVerified!==true)blockers.push('SOURCE_NOT_VERIFIED');
    if(input.licenseReviewed!==true)blockers.push('LICENSE_NOT_REVIEWED');
    if(!text(input.integrityDigest))blockers.push('INTEGRITY_DIGEST_REQUIRED');
    if(input.compatibilityChecked!==true)blockers.push('COMPATIBILITY_NOT_CHECKED');
  }
  if(operation==='acquire'){
    const size=Number(input.sizeBytes??0),free=Number(input.storageFreeBytes??0);
    if(size>0&&(!Number.isFinite(free)||free<size))blockers.push('INSUFFICIENT_STORAGE');
  }
  if(operation==='mount'){
    if(input.integrityVerified!==true)blockers.push('LOCAL_INTEGRITY_NOT_VERIFIED');
    if(!text(input.localPath))blockers.push('LOCAL_ARTIFACT_REQUIRED');
    if(!text(input.runtimeTarget))blockers.push('RUNTIME_TARGET_REQUIRED');
  }
  if(input.arbitraryInstallerRequired===true)blockers.push('ARBITRARY_INSTALLER_BLOCKED');
  if(!text(input.license))warnings.push('LICENSE_UNKNOWN');
  return {passed:blockers.length===0,operation,status:blockers.length?'BLOCKED':'READY',blockers:[...new Set(blockers)],warnings:[...new Set(warnings)]};
}
