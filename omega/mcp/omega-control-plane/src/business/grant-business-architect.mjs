import { grantPreflight, grantFinalGate } from '../../../../hooks/grant-business-architect.mjs';
import { unitEconomics, scenarioModel, budgetAudit } from '../../../../tools/grant-business-architect/grant-math.mjs';

const clone=v=>structuredClone(v);
const get=(obj,path)=>String(path).split('.').reduce((v,k)=>v==null?undefined:v[k],obj);

export class GrantBusinessArchitectRuntime{
  constructor({root,clock=()=>new Date().toISOString()}={}){if(!root)throw new Error('root is required');this.root=root;this.clock=clock}

  async action({action,payload={}}={}){
    const handlers={
      'preflight':()=>grantPreflight(payload),
      'criteria-matrix':()=>this.criteria(payload),
      'unit-economics':()=>unitEconomics(payload),
      'scenario-model':()=>({scenarios:scenarioModel(payload)}),
      'budget-audit':()=>budgetAudit(payload.items??[]),
      'risk-register':()=>this.risks(payload),
      'cross-consistency':()=>this.consistency(payload),
      'missing-data':()=>this.missing(payload),
      'final-gate':()=>grantFinalGate(payload)
    };
    const fn=handlers[action];if(!fn)throw new Error('Unsupported grant-business action: '+action);
    return await fn();
  }

  criteria({criteria=[],evidence=[]}={}){
    if(!Array.isArray(criteria)||!Array.isArray(evidence))throw new Error('criteria and evidence must be arrays');
    const verified=new Set(evidence.filter(x=>x?.verified===true).map(x=>String(x.id)));
    let awarded=0,max=0;
    const rows=criteria.map((c,index)=>{
      const id=String(c.id??('criterion-'+(index+1)));
      const maxPoints=Number(c.maxPoints??0);if(!Number.isFinite(maxPoints)||maxPoints<0)throw new Error('maxPoints must be >= 0');
      max+=maxPoints;
      const evidenceIds=(c.evidenceIds??[]).map(String);
      const supported=evidenceIds.length>0&&evidenceIds.every(x=>verified.has(x));
      const claimed=Number(c.claimedPoints??0);
      const safeClaim=Number.isFinite(claimed)?Math.max(0,Math.min(maxPoints,claimed)):0;
      const status=c.satisfied===false?'UNSATISFIED':supported&&c.satisfied===true?'SATISFIED':'TO_VERIFY';
      const points=status==='SATISFIED'?safeClaim:0;awarded+=points;
      return {id,requirement:String(c.requirement??''),mandatory:c.mandatory===true,maxPoints,claimedPoints:safeClaim,awardedPoints:points,evidenceIds,status};
    });
    return {rows,awardedPoints:awarded,maxPoints:max,coverage:max===0?null:awarded/max,verifiedEvidenceOnly:true};
  }

  risks({risks=[]}={}){
    if(!Array.isArray(risks))throw new Error('risks must be an array');
    const rows=risks.map((r,index)=>{
      const probability=Number(r.probability),impact=Number(r.impact);
      if(!Number.isInteger(probability)||probability<1||probability>5)throw new Error('probability must be integer 1..5');
      if(!Number.isInteger(impact)||impact<1||impact>5)throw new Error('impact must be integer 1..5');
      const score=probability*impact;
      return {id:String(r.id??('risk-'+(index+1))),risk:String(r.risk??''),probability,impact,score,level:score>=16?'CRITICAL':score>=10?'HIGH':score>=5?'MEDIUM':'LOW',prevention:String(r.prevention??''),contingency:String(r.contingency??'')};
    });
    return {risks:rows,critical:rows.filter(x=>x.level==='CRITICAL').length,high:rows.filter(x=>x.level==='HIGH').length};
  }

  consistency({facts={},relations=[]}={}){
    if(!Array.isArray(relations))throw new Error('relations must be an array');
    const checks=relations.map((r,index)=>{
      const left=get(facts,r.left),right=get(facts,r.right),op=r.operator??'eq',tol=Number(r.tolerance??0);
      let passed=false;
      if(op==='eq'){
        if(typeof left==='number'&&typeof right==='number')passed=Math.abs(left-right)<=tol;
        else passed=left===right;
      }else if(op==='lte')passed=Number(left)<=Number(right)+tol;
      else if(op==='gte')passed=Number(left)+tol>=Number(right);
      else throw new Error('Unsupported consistency operator: '+op);
      return {id:String(r.id??('relation-'+(index+1))),leftPath:r.left,rightPath:r.right,operator:op,left:clone(left),right:clone(right),tolerance:tol,passed};
    });
    return {passed:checks.every(x=>x.passed),checks};
  }

  missing({items=[]}={}){
    if(!Array.isArray(items))throw new Error('items must be an array');
    const groups={CRITICAL:[],IMPORTANT:[],OPTIONAL:[]};
    for(const item of items){
      const state=String(item.state??'UNKNOWN');
      if(!['UNKNOWN','TO_VERIFY'].includes(state))continue;
      const priority=['CRITICAL','IMPORTANT','OPTIONAL'].includes(item.priority)?item.priority:'IMPORTANT';
      groups[priority].push({id:String(item.id??''),label:String(item.label??''),state});
    }
    return {...groups,canContinue:groups.CRITICAL.length===0,generatedAt:this.clock()};
  }
}
