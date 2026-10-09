const uniq=(xs=[])=>[...new Set((Array.isArray(xs)?xs:[]).map(x=>String(x).trim()).filter(Boolean))];

function score(value,name){
  const n=Number(value);
  if(!Number.isFinite(n)||n<0||n>5)throw new Error(name+' must be a finite number in 0..5');
  return n;
}

export function normalizeInvariantModel(input={}){
  const model={
    name:String(input.name??'model').trim()||'model',
    states:uniq(input.states),
    inputs:uniq(input.inputs),
    transitions:uniq(input.transitions),
    invariants:uniq(input.invariants),
    preconditions:uniq(input.preconditions),
    postconditions:uniq(input.postconditions),
    forbiddenStates:uniq(input.forbiddenStates),
    evidenceIds:uniq(input.evidenceIds)
  };
  const issues=[];
  if(model.states.length===0)issues.push('NO_STATES');
  if(model.transitions.length===0)issues.push('NO_TRANSITIONS');
  if(model.invariants.length===0)issues.push('NO_INVARIANTS');
  if(model.evidenceIds.length===0)issues.push('NO_EVIDENCE');
  for(const state of model.forbiddenStates)if(!model.states.includes(state))issues.push('FORBIDDEN_STATE_UNDECLARED:'+state);
  return {model,issues,complete:issues.length===0};
}

export function assessCounterexample({model={},counterexample={}}={}){
  const normalized=normalizeInvariantModel(model);
  const violates=uniq(counterexample.violates);
  const unknown=violates.filter(x=>!normalized.model.invariants.includes(x));
  const observed=counterexample.observed===true;
  const accepted=observed&&violates.length>0&&unknown.length===0;
  return {
    accepted,
    disposition:accepted?'REVISE_MODEL':'INCONCLUSIVE',
    violatedInvariants:violates,
    unknownInvariants:unknown,
    evidenceId:counterexample.evidenceId??null,
    modelComplete:normalized.complete
  };
}

export function architectureDecisionScore(input={}){
  const value=score(input.value,'value');
  const maintainability=score(input.maintainability,'maintainability');
  const complexity=score(input.complexity,'complexity');
  const risk=score(input.risk,'risk');
  const reversibility=score(input.reversibility??0,'reversibility');
  const total=Math.round(((value+maintainability+reversibility)-(complexity+risk))*100)/100;
  return {value,maintainability,complexity,risk,reversibility,total,recommended:total>0};
}
