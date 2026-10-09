const toTime=v=>{const t=new Date(v).getTime();return Number.isFinite(t)?t:null};

export function selectOperationalDeadline(candidates=[]){
  if(!Array.isArray(candidates)||candidates.length===0)return {deadline:null,conflict:false,blocker:'NO_DEADLINE_EVIDENCE'};
  const valid=candidates.map((x,i)=>({
    id:String(x.id??('deadline-'+(i+1))),
    source:String(x.source??''),
    time:toTime(x.time)
  })).filter(x=>x.time!==null);
  if(valid.length===0)return {deadline:null,conflict:false,blocker:'NO_VALID_DEADLINE'};
  valid.sort((a,b)=>a.time-b.time);
  return {
    deadline:new Date(valid[0].time).toISOString(),
    conflict:new Set(valid.map(x=>x.time)).size>1,
    selectedEvidenceId:valid[0].id,
    candidates:valid.map(x=>({...x,time:new Date(x.time).toISOString()}))
  };
}

export function auditBuildLedger({entries=[],windowStart,windowEnd}={}){
  const start=toTime(windowStart),end=toTime(windowEnd);
  if(start===null||end===null||end<=start)throw new Error('valid build window required');
  if(!Array.isArray(entries))throw new Error('entries must be an array');
  const audited=entries.map((e,i)=>{
    const created=toTime(e.createdAt);
    const origin=String(e.origin??'UNKNOWN').toUpperCase();
    const issues=[];
    if(created===null)issues.push('MISSING_TIMESTAMP');
    if(!['PREEXISTING','EVENT','THIRD_PARTY'].includes(origin))issues.push('UNKNOWN_ORIGIN');
    if(origin==='EVENT'&&created!==null&&(created<start||created>end))issues.push('EVENT_WORK_OUTSIDE_WINDOW');
    if(origin!=='EVENT'&&e.declared!==true)issues.push('DECLARATION_REQUIRED');
    return {
      id:String(e.id??('entry-'+(i+1))),
      origin,
      createdAt:created===null?null:new Date(created).toISOString(),
      declared:e.declared===true,
      issues
    };
  });
  return {entries:audited,passed:audited.every(x=>x.issues.length===0)};
}

export function submissionReadiness(input={}){
  const blockers=[];
  if(input.eligible!==true)blockers.push('ELIGIBILITY_NOT_CONFIRMED');
  if(input.buildLedgerPassed!==true)blockers.push('BUILD_LEDGER_FAILED');
  if(input.functionalPrototype!==true)blockers.push('FUNCTIONAL_PROTOTYPE_REQUIRED');
  for(const a of input.artifacts??[]){
    if(a?.required===true&&a?.present!==true)blockers.push('MISSING_ARTIFACT:'+String(a.id??a.name??'unknown'));
  }
  if(input.beforeDeadline!==true)blockers.push('DEADLINE_GATE_FAILED');
  return {passed:blockers.length===0,status:blockers.length===0?'READY_FOR_SUBMISSION':'BLOCKED',blockers:[...new Set(blockers)]};
}
