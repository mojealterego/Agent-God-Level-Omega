const CLAIM_STATES=new Set(['FACT','ASSUMPTION','ESTIMATE','UNKNOWN','TO_VERIFY','EXECUTED','VERIFIED']);
const REQUIREMENT_STATES=new Set(['OPEN','IN_PROGRESS','SATISFIED','FAILED','DEFERRED']);

export function validateProjectState(input={}){
  const blockers=[];
  for(const claim of Array.isArray(input.claims)?input.claims:[]){
    const id=String(claim?.id??'unknown');
    if(!CLAIM_STATES.has(claim?.state))blockers.push('INVALID_CLAIM_STATE:'+id);
    if(claim?.critical===true&&['UNKNOWN','TO_VERIFY'].includes(claim?.state))blockers.push('CRITICAL_CLAIM_UNRESOLVED:'+id);
  }
  for(const req of Array.isArray(input.requirements)?input.requirements:[]){
    const id=String(req?.id??'unknown');
    if(!REQUIREMENT_STATES.has(req?.status))blockers.push('INVALID_REQUIREMENT_STATE:'+id);
    if(req?.required!==false&&req?.status!=='SATISFIED')blockers.push('REQUIREMENT_NOT_SATISFIED:'+id);
  }
  return {passed:blockers.length===0,blockers:[...new Set(blockers)]};
}

export function detectRetryLoop(history=[]){
  const seq=Array.isArray(history)?history:[];
  if(seq.length<3)return {loop:false,repetitions:0};
  const last=seq[seq.length-1]??{};
  const key=JSON.stringify([last.action??null,last.error??null,last.target??null]);
  let repetitions=0;
  for(let i=seq.length-1;i>=0;i--){
    const item=seq[i]??{};
    if(JSON.stringify([item.action??null,item.error??null,item.target??null])===key)repetitions++;
    else break;
  }
  return {loop:repetitions>=3,repetitions,strategyChangeRequired:repetitions>=3};
}

export function completionState({planned=false,implemented=false,executed=false,verified=false}={}){
  const state=verified?'VERIFIED':executed?'EXECUTED':implemented?'IMPLEMENTED':planned?'PLANNED':'UNKNOWN';
  return {state,completed:verified===true};
}
