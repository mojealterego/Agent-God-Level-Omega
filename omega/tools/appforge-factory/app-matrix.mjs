const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,Number(n)||0));
const text=v=>String(v??'').trim();

export function normalizeOpportunity(item={},index=0){
  return {
    id:text(item.id)||`opportunity-${index+1}`,
    title:text(item.title),
    kind:['niche','developer'].includes(text(item.kind).toLowerCase())?text(item.kind).toLowerCase():'niche',
    targetUser:text(item.targetUser),
    problem:text(item.problem),
    evidenceCount:Math.max(0,Number(item.evidenceCount??0)||0),
    unmetNeed:clamp(item.unmetNeed??0.5),
    feasibility:clamp(item.feasibility??0.5),
    differentiation:clamp(item.differentiation??0.5),
    distribution:clamp(item.distribution??0.5),
    duplicateChecked:item.duplicateChecked===true,
    acceptanceCriteria:Array.isArray(item.acceptanceCriteria)?item.acceptanceCriteria.map(text).filter(Boolean):[]
  };
}

export function scoreOpportunity(item={}){
  const x=normalizeOpportunity(item);
  const evidence=clamp(x.evidenceCount/4);
  const duplicate=x.duplicateChecked?1:0;
  const criteria=x.acceptanceCriteria.length?1:0;
  return Number(clamp(0.24*x.unmetNeed+0.20*x.feasibility+0.18*x.differentiation+0.12*x.distribution+0.14*evidence+0.07*duplicate+0.05*criteria).toFixed(3));
}

export function buildApplicationMatrix(input={}){
  const items=Array.isArray(input.opportunities)?input.opportunities:[];
  const nicheCount=Math.max(0,Math.min(100,Number(input.nicheCount??33)||0));
  const developerCount=Math.max(0,Math.min(100,Number(input.developerCount??33)||0));
  const ranked=items.map((item,index)=>{const x=normalizeOpportunity(item,index);return {...x,score:scoreOpportunity(x)}})
    .sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title));
  const eligible=ranked.filter(x=>x.targetUser&&x.problem&&x.duplicateChecked&&x.acceptanceCriteria.length);
  const niche=eligible.filter(x=>x.kind==='niche').slice(0,nicheCount);
  const developer=eligible.filter(x=>x.kind==='developer').slice(0,developerCount);
  return {
    requested:{niche:nicheCount,developer:developerCount},
    selected:{niche,developer},
    gaps:{niche:Math.max(0,nicheCount-niche.length),developer:Math.max(0,developerCount-developer.length)},
    rejected:ranked.filter(x=>!eligible.includes(x)).map(x=>({id:x.id,title:x.title,score:x.score}))
  };
}
