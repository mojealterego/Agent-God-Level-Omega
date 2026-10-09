const set=x=>new Set((Array.isArray(x)?x:[]).map(v=>String(v).trim()).filter(Boolean));

export function assessVisualChangeBudget(input={}){
  const locked=set(input.locked);
  const requested=set(input.requestedChanges);
  const derived=set(input.derivedChanges);
  const scope=String(input.scope??'LOCAL').toUpperCase();
  const allowedScopes=new Set(['MICRO','LOCAL','REGIONAL','GLOBAL']);
  if(!allowedScopes.has(scope))throw new Error('scope must be MICRO, LOCAL, REGIONAL or GLOBAL');

  const violations=[];
  for(const key of requested)if(locked.has(key))violations.push('LOCKED_FIELD_CHANGED:'+key);
  for(const key of derived)if(locked.has(key)&&!requested.has(key))violations.push('DERIVED_CHANGE_TOUCHES_LOCK:'+key);
  if(scope!=='GLOBAL'&&input.globalRegeneration===true)violations.push('GLOBAL_REGEN_EXCEEDS_CHANGE_BUDGET');
  if(input.subjectCountChanged===true&&input.subjectCountExplicitlyRequested!==true)violations.push('SUBJECT_COUNT_DRIFT');
  if(input.identityMigration===true)violations.push('IDENTITY_FIREWALL_VIOLATION');
  if(input.exactTextChanged===true)violations.push('EXACT_TEXT_DRIFT');

  return {
    passed:violations.length===0,
    scope,
    locked:[...locked],
    requestedChanges:[...requested],
    derivedChanges:[...derived],
    violations:[...new Set(violations)]
  };
}
