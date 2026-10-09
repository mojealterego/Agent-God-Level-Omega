const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const finite=(v,n)=>{const x=Number(v);if(!Number.isFinite(x))throw new Error(n+' must be finite');return x};

export function normalizeEvidence(item={},index=0){
  const confidence=clamp(finite(item.confidence??0.5,'confidence'),0,1);
  const observedAt=String(item.observedAt??'').trim()||null;
  const source=String(item.source??'').trim();
  const allowedStates=new Set(['OBSERVED','CORROBORATED','CONTRADICTED','INFERRED','UNKNOWN','REDACTED']);
  const state=allowedStates.has(item.state)?item.state:'OBSERVED';
  return {
    id:String(item.id??('evidence-'+(index+1))),
    source,
    sourceClass:String(item.sourceClass??'public'),
    observedAt,
    claim:String(item.claim??'').trim(),
    state,
    confidence,
    minimized:item.minimized===true,
    corroborates:Array.isArray(item.corroborates)?item.corroborates.map(String):[],
    contradicts:Array.isArray(item.contradicts)?item.contradicts.map(String):[]
  };
}

export function fuseEvidence(items=[]){
  if(!Array.isArray(items))throw new Error('items must be an array');
  const evidence=items.map(normalizeEvidence);
  const groups=new Map();
  for(const e of evidence){
    const key=e.claim.toLowerCase();
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(e);
  }
  const claims=[...groups.entries()].map(([claim,group])=>{
    const positive=group.filter(x=>x.state!=='CONTRADICTED');
    const negative=group.filter(x=>x.state==='CONTRADICTED');
    const avg=positive.length?positive.reduce((s,x)=>s+x.confidence,0)/positive.length:0;
    const score=clamp(avg-Math.min(0.5,negative.length*0.15),0,1);
    return {claim,score:Number(score.toFixed(3)),evidenceIds:group.map(x=>x.id),hasConflict:negative.length>0};
  });
  return {evidence,claims:claims.sort((a,b)=>b.score-a.score)};
}

export function buildTimeline(items=[]){
  return items.map(normalizeEvidence)
    .filter(x=>x.observedAt)
    .sort((a,b)=>new Date(a.observedAt)-new Date(b.observedAt))
    .map(x=>({id:x.id,observedAt:x.observedAt,claim:x.claim,state:x.state,confidence:x.confidence}));
}
