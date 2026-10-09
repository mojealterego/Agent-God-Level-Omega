import {normalizeInvariantModel,assessCounterexample} from '../tools/omni-imandra/invariant-model.mjs';

const EVIDENCE_STATES=new Set(['OBSERVED','VERIFIED','INFERRED','PROPOSED','UNKNOWN']);

export function omniImandraPreflight({model={},claims=[]}={}){
  const normalized=normalizeInvariantModel(model);
  const blockers=[...normalized.issues];
  for(const claim of Array.isArray(claims)?claims:[]){
    const id=String(claim?.id??'unknown');
    if(!EVIDENCE_STATES.has(claim?.state))blockers.push('INVALID_EVIDENCE_STATE:'+id);
    if(claim?.critical===true&&['UNKNOWN','PROPOSED'].includes(claim?.state))blockers.push('CRITICAL_CLAIM_UNRESOLVED:'+id);
  }
  return {passed:blockers.length===0,blockers:[...new Set(blockers)],model:normalized.model};
}

export function omniImandraCounterexampleGate({model={},counterexamples=[]}={}){
  const results=(Array.isArray(counterexamples)?counterexamples:[]).map(x=>assessCounterexample({model,counterexample:x}));
  const accepted=results.filter(x=>x.accepted);
  return {
    passed:accepted.length===0,
    status:accepted.length===0?'MODEL_NOT_DISPROVEN':'MODEL_REVISION_REQUIRED',
    acceptedCounterexamples:accepted,
    results
  };
}
