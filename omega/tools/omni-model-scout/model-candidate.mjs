const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const text=v=>String(v??'').trim();

export function normalizeModelCandidate(item={},index=0){
  const tags=Array.isArray(item.tags)?[...new Set(item.tags.map(x=>text(x).toLowerCase()).filter(Boolean))]:[];
  const sizeBytes=Number(item.sizeBytes??0);
  return {
    id:text(item.id)||`model-${index+1}`,
    modelId:text(item.modelId||item.name),
    sourceUrl:text(item.sourceUrl),
    sourceVerified:item.sourceVerified===true,
    publisherVerified:item.publisherVerified===true,
    format:text(item.format).toLowerCase(),
    quantization:text(item.quantization),
    tags,
    license:text(item.license),
    licenseReviewed:item.licenseReviewed===true,
    integrityDigest:text(item.integrityDigest||item.sha256),
    compatibilityChecked:item.compatibilityChecked===true,
    localFit:clamp(item.localFit??0.5),
    evidenceCount:Math.max(0,Number(item.evidenceCount??0)||0),
    sizeBytes:Number.isFinite(sizeBytes)&&sizeBytes>0?sizeBytes:0,
    publishedAt:text(item.publishedAt)||null
  };
}

export function scoreModelCandidate(item={}){
  const x=normalizeModelCandidate(item);
  let score=0;
  if(x.sourceVerified)score+=0.18;
  if(x.publisherVerified)score+=0.10;
  if(x.licenseReviewed&&x.license)score+=0.14;
  if(x.integrityDigest)score+=0.16;
  if(x.compatibilityChecked)score+=0.14;
  if(['gguf','safetensors'].includes(x.format))score+=0.08;
  score+=0.12*x.localFit;
  score+=0.08*clamp(x.evidenceCount/4);
  return Number(clamp(score).toFixed(3));
}

export function rankModelCandidates(items=[]){
  if(!Array.isArray(items))throw new Error('items must be an array');
  return items.map((item,index)=>{
    const candidate=normalizeModelCandidate(item,index);
    return {...candidate,score:scoreModelCandidate(candidate)};
  }).sort((a,b)=>b.score-a.score||a.modelId.localeCompare(b.modelId));
}
