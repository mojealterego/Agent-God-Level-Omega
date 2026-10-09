const finite=(v,n)=>{const x=Number(v);if(!Number.isFinite(x))throw new Error(n+' must be finite');return x};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const round=x=>Math.round((x+Number.EPSILON)*1000)/1000;

export function scoreEvolutionCandidate(input={}){
  const improvement=clamp(finite(input.improvement??0,'improvement'),-1,1);
  const confidence=clamp(finite(input.confidence??0,'confidence'),0,1);
  const regressionRisk=clamp(finite(input.regressionRisk??0,'regressionRisk'),0,1);
  const securityRisk=clamp(finite(input.securityRisk??0,'securityRisk'),0,1);
  const cost=clamp(finite(input.cost??0,'cost'),0,1);
  const evidenceQuality=clamp(finite(input.evidenceQuality??0,'evidenceQuality'),0,1);
  const score=round(
    improvement*0.35+
    confidence*0.2+
    evidenceQuality*0.2-
    regressionRisk*0.1-
    securityRisk*0.1-
    cost*0.05
  );
  return {score,improvement,confidence,evidenceQuality,regressionRisk,securityRisk,cost,recommended:score>=0.25&&improvement>0&&securityRisk<0.7};
}

export function rankEvolutionCandidates(candidates=[]){
  if(!Array.isArray(candidates))throw new Error('candidates must be an array');
  return candidates.map((candidate,index)=>({
    id:String(candidate.id??('candidate-'+(index+1))),
    ...scoreEvolutionCandidate(candidate)
  })).sort((a,b)=>b.score-a.score);
}
