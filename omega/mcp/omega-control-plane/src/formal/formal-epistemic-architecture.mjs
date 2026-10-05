import { createHash } from 'node:crypto';

function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
}
function hash(value) { return createHash('sha256').update(stable(value)).digest('hex'); }
function clamp(x,min=0,max=1){ return Math.max(min,Math.min(max,Number(x))); }
function clean(x){ return Number(Number(x).toFixed(12)); }

export class FiniteCategory {
  constructor({objects=[],morphisms=[],identities={},composition={}}={}) {
    this.objects=new Set(objects);
    this.morphisms=new Map(morphisms.map(m=>[m.id,{...m}]));
    this.identities={...identities};
    this.composition={...composition};
  }
  morphism(id){ const m=this.morphisms.get(id); if(!m) throw new Error(`Unknown morphism ${id}`); return {...m}; }
  compose(g,f){
    const fm=this.morphism(f), gm=this.morphism(g);
    if(fm.to!==gm.from) throw new Error(`Non-composable morphisms ${g} after ${f}`);
    const id=this.composition[`${g}|${f}`];
    if(!id) throw new Error(`Missing composition ${g}|${f}`);
    const out=this.morphism(id);
    if(out.from!==fm.from||out.to!==gm.to) throw new Error(`Composition ${g}|${f} has invalid endpoints`);
    return out;
  }
  verify(){
    const errors=[];
    for(const [id,m] of this.morphisms){
      if(!this.objects.has(m.from)||!this.objects.has(m.to)) errors.push({code:'MORPHISM_ENDPOINT',id});
    }
    for(const o of this.objects){
      const iid=this.identities[o]; const im=this.morphisms.get(iid);
      if(!im||im.from!==o||im.to!==o) { errors.push({code:'IDENTITY_MISSING',object:o}); continue; }
      for(const [id,m] of this.morphisms){
        if(m.from===o){ try{ if(this.compose(id,iid).id!==id) errors.push({code:'RIGHT_IDENTITY',morphism:id}); }catch{ errors.push({code:'RIGHT_IDENTITY_UNDEFINED',morphism:id}); } }
        if(m.to===o){ try{ if(this.compose(iid,id).id!==id) errors.push({code:'LEFT_IDENTITY',morphism:id}); }catch{ errors.push({code:'LEFT_IDENTITY_UNDEFINED',morphism:id}); } }
      }
    }
    const ms=[...this.morphisms.values()];
    for(const f of ms) for(const g of ms) for(const h of ms){
      if(f.to!==g.from||g.to!==h.from) continue;
      try{
        const gf=this.compose(g.id,f.id); const hg=this.compose(h.id,g.id);
        const left=this.compose(h.id,gf.id).id; const right=this.compose(hg.id,f.id).id;
        if(left!==right) errors.push({code:'ASSOCIATIVITY',triple:[f.id,g.id,h.id],left,right});
      }catch(error){ errors.push({code:'ASSOCIATIVITY_UNDEFINED',triple:[f.id,g.id,h.id],message:error.message}); }
    }
    return {valid:errors.length===0,errors,objects:this.objects.size,morphisms:this.morphisms.size};
  }
}

export class FunctorVerifier {
  verify({source,target,objectMap={},morphismMap={}}={}){
    const errors=[];
    const sv=source.verify(), tv=target.verify();
    if(!sv.valid) errors.push({code:'SOURCE_NOT_CATEGORY',errors:sv.errors});
    if(!tv.valid) errors.push({code:'TARGET_NOT_CATEGORY',errors:tv.errors});
    for(const o of source.objects){ if(!target.objects.has(objectMap[o])) errors.push({code:'OBJECT_MAP',object:o}); }
    for(const [id,m] of source.morphisms){
      const mapped=morphismMap[id];
      if(!mapped||!target.morphisms.has(mapped)){ errors.push({code:'MORPHISM_MAP',morphism:id}); continue; }
      const mm=target.morphism(mapped);
      if(mm.from!==objectMap[m.from]||mm.to!==objectMap[m.to]) errors.push({code:'ENDPOINT_PRESERVATION',morphism:id});
    }
    for(const o of source.objects){ if(morphismMap[source.identities[o]]!==target.identities[objectMap[o]]) errors.push({code:'IDENTITY_PRESERVATION',object:o}); }
    for(const [key,result] of Object.entries(source.composition)){
      const [g,f]=key.split('|');
      if(!morphismMap[g]||!morphismMap[f]||!morphismMap[result]) continue;
      try{ if(target.compose(morphismMap[g],morphismMap[f]).id!==morphismMap[result]) errors.push({code:'COMPOSITION_PRESERVATION',composition:key}); }
      catch(error){ errors.push({code:'COMPOSITION_UNDEFINED',composition:key,message:error.message}); }
    }
    return {valid:errors.length===0,errors};
  }
}

const BELNAP={
  TRUE:{label:'TRUE',t:1,f:0}, FALSE:{label:'FALSE',t:0,f:1}, BOTH:{label:'BOTH',t:1,f:1}, NEITHER:{label:'NEITHER',t:0,f:0}
};
function belnap(t,f){ return Object.values(BELNAP).find(x=>x.t===t&&x.f===f); }
export class BelnapLogic {
  value(label){ const v=BELNAP[label]; if(!v) throw new Error(`Unknown Belnap value ${label}`); return {...v}; }
  fromEvidence({positive=0,negative=0}={}){ return {...belnap(positive>0?1:0,negative>0?1:0),positive,negative}; }
  not(a){ return {...belnap(a.f,a.t)}; }
  and(a,b){ return {...belnap(a.t&&b.t,a.f||b.f)}; }
  or(a,b){ return {...belnap(a.t||b.t,a.f&&b.f)}; }
}
export class LukasiewiczLogic {
  not(a){ return clean(1-clamp(a)); }
  and(a,b){ return clean(Math.max(0,clamp(a)+clamp(b)-1)); }
  or(a,b){ return clean(Math.min(1,clamp(a)+clamp(b))); }
  implies(a,b){ return clean(Math.min(1,1-clamp(a)+clamp(b))); }
}

export class EpistemicDefragmenter {
  constructor({resolutionMargin=0.2}={}){ this.resolutionMargin=resolutionMargin; }
  scan(records=[]){
    const groups=new Map();
    for(const r of records){ const k=`${r.perspective??'default'}::${r.key}`; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(r); }
    const consistent=[],resolved=[],quarantined=[];
    for(const [group,items] of groups){
      const byValue=new Map(); for(const item of items){ const k=stable(item.value); if(!byValue.has(k))byValue.set(k,[]); byValue.get(k).push(item); }
      if(byValue.size<=1){ consistent.push({group,items}); continue; }
      const candidates=[...byValue.values()].map(xs=>({value:xs[0].value,confidence:Math.max(...xs.map(x=>Number(x.confidence??0))),records:xs})).sort((a,b)=>b.confidence-a.confidence);
      if(candidates[0].confidence-(candidates[1]?.confidence??0)>=this.resolutionMargin){
        const winner=[...candidates[0].records].sort((a,b)=>Number(b.confidence??0)-Number(a.confidence??0))[0];
        resolved.push({group,winner,rejected:candidates.slice(1).flatMap(x=>x.records),reason:'EVIDENCE_MARGIN'});
      } else quarantined.push({group,candidates,reason:'UNRESOLVED_CONTRADICTION'});
    }
    return {consistent,resolved,quarantined,absoluteConsistencyClaimed:false};
  }
}

function validateIr(ir){
  if(!ir?.name||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(ir.name)) throw new Error('Invalid IR name');
  const names=new Set((ir.inputs??[]).map(x=>x.name));
  if(names.size!==(ir.inputs??[]).length) throw new Error('Duplicate IR input');
  return names;
}
function expr(node,lang,names){
  if(node&&Object.hasOwn(node,'const')) return Number(node.const).toString();
  if(node?.var){ if(!names.has(node.var)) throw new Error(`Unknown variable ${node.var}`); return node.var; }
  const op=node?.op, args=node?.args??[];
  if(['add','sub','mul','div'].includes(op)&&args.length===2){ const sym={add:'+',sub:'-',mul:'*',div:'/'}[op]; return `(${expr(args[0],lang,names)} ${sym} ${expr(args[1],lang,names)})`; }
  if(['min','max'].includes(op)&&args.length===2){
    if(lang==='c99') return `${op==='min'?'fmin':'fmax'}(${expr(args[0],lang,names)}, ${expr(args[1],lang,names)})`;
    if(lang==='python') return `${op}(${expr(args[0],lang,names)}, ${expr(args[1],lang,names)})`;
    return `Math.${op}(${expr(args[0],lang,names)}, ${expr(args[1],lang,names)})`;
  }
  throw new Error(`Unsupported IR expression ${op}`);
}
export class PortableIrCompiler {
  compile(ir,target){
    const names=validateIr(ir); const e=expr(ir.expr,target,names); const params=(ir.inputs??[]).map(x=>x.name).join(', ');
    if(target==='javascript') return `export function ${ir.name}(${params}) { return ${e}; }\n`;
    if(target==='python') return `def ${ir.name}(${params}):\n    return ${e}\n`;
    if(target==='c99'){ const decl=(ir.inputs??[]).map(x=>`double ${x.name}`).join(', '); return `#include <math.h>\ndouble ${ir.name}(${decl}) { return ${e}; }\n`; }
    throw new Error(`Unsupported portable IR target: ${target}`);
  }
}

export class FiniteStateVerifier {
  constructor({maxStates=10000}={}){ this.maxStates=maxStates; }
  verify({initial,transitions={},invariants=[],terminalRequired=false}={}){
    const queue=[{state:initial,path:[initial]}], visited=new Set();
    while(queue.length){
      const cur=queue.shift(); if(visited.has(cur.state)) continue; visited.add(cur.state);
      if(visited.size>this.maxStates) return {valid:false,inconclusive:true,reason:'STATE_BOUND_EXCEEDED',explored:visited.size};
      for(const inv of invariants){ if(!inv.check(cur.state)) return {valid:false,inconclusive:false,counterexample:{state:cur.state,path:cur.path,invariant:inv.id},explored:visited.size}; }
      const next=transitions[cur.state]??[];
      if(terminalRequired&&next.length===0&&cur.state!==terminalRequired) return {valid:false,inconclusive:false,counterexample:{state:cur.state,path:cur.path,reason:'UNEXPECTED_TERMINAL'}};
      for(const n of next) if(!visited.has(n)) queue.push({state:n,path:[...cur.path,n]});
    }
    return {valid:true,inconclusive:false,explored:visited.size,proofScope:'FINITE_REACHABILITY'};
  }
}

export class SubstrateExperimentPlanner {
  rank({candidates=[],objectives=[],constraints={}}={}){
    if(!candidates.length) return [];
    const ranges={}; for(const o of objectives){ const vals=candidates.map(c=>Number(c.metrics?.[o.key]??0)); ranges[o.key]={min:Math.min(...vals),max:Math.max(...vals)}; }
    return candidates.map(c=>{
      const violations=[];
      for(const [key,rule] of Object.entries(constraints)){ const v=Number(c.metrics?.[key]??NaN); if(rule.min!=null&&!(v>=rule.min))violations.push(`${key}.min`); if(rule.max!=null&&!(v<=rule.max))violations.push(`${key}.max`); }
      let score=0; for(const o of objectives){ const v=Number(c.metrics?.[o.key]??0),r=ranges[o.key]; let n=r.max===r.min?1:(v-r.min)/(r.max-r.min); if(o.direction==='min')n=1-n; score+=n*Number(o.weight??1); }
      return {...c,eligible:violations.length===0,violations,score,fabricationClaimed:false};
    }).sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.score-a.score||String(a.id).localeCompare(String(b.id)));
  }
}

export class HybridComputeRouter {
  route({problem={},classical={},quantum={}}={}){
    let route='unavailable';
    if(classical.available&&quantum.available) route=(quantum.estimatedMs??Infinity)<(classical.estimatedMs??Infinity)?'quantum':'classical';
    else if(classical.available) route='classical'; else if(quantum.available) route='quantum';
    return {route,problem,quantumAdvantageClaimed:false,reason:route==='unavailable'?'NO_AVAILABLE_PROVIDER':'ESTIMATED_COST_LATENCY'};
  }
}

export class EnergyBudgetGovernor {
  evaluate({powerWatts,durationSeconds,carbonIntensityGPerKwh=0,budgetKwh=Infinity,maxPowerWatts=Infinity,maxCarbonGrams=Infinity}={}){
    const joules=Number(powerWatts)*Number(durationSeconds); const energyKwh=joules/3_600_000; const carbonGrams=energyKwh*Number(carbonIntensityGPerKwh);
    const withinBudget=energyKwh<=budgetKwh&&Number(powerWatts)<=maxPowerWatts&&carbonGrams<=maxCarbonGrams;
    return {joules,energyKwh,carbonGrams,withinBudget,landauerLimitClaimed:false};
  }
  rank(candidates=[]){ return [...candidates].sort((a,b)=>(a.energyKwh??Infinity)-(b.energyKwh??Infinity)||(a.latencyMs??Infinity)-(b.latencyMs??Infinity)); }
}

export class ConstitutionManifest {
  constructor({rules=[]}={}){ this.rules=[...rules].sort((a,b)=>String(a.id).localeCompare(String(b.id))); }
  snapshot(){ const rules=this.rules.map(r=>({...r})); return {rules,hash:hash(rules)}; }
}
export class AlignmentRegressionGate {
  evaluate({baseline,candidate,regressions=[],proofs=[]}={}){
    const findings=[]; const base=new Map((baseline?.rules??[]).filter(r=>r.protected).map(r=>[r.id,r])); const cand=new Map((candidate?.rules??[]).map(r=>[r.id,r]));
    for(const [id,rule] of base){ const c=cand.get(id); if(!c) findings.push({code:'PROTECTED_RULE_REMOVED',id}); else if(stable(c)!==stable(rule)) findings.push({code:'PROTECTED_RULE_CHANGED',id}); }
    for(const r of regressions) findings.push({code:'PREFERENCE_REGRESSION',detail:r});
    for(const p of proofs) if(p.required&&p.status!=='VERIFIED') findings.push({code:'PROOF_NOT_VERIFIED',id:p.id,status:p.status});
    return {allowed:findings.length===0,findings,provableGlobalAlignmentClaimed:false,baselineHash:baseline?.hash,candidateHash:candidate?.hash};
  }
}

export class FallibilismGate {
  constructor({highImpactThreshold=0.98,normalThreshold=0.75}={}){ this.highImpactThreshold=highImpactThreshold; this.normalThreshold=normalThreshold; }
  decide({confidence=0,risk='low',unresolvedAssumptions=0,counterEvidence=0,rollbackCheckpoint=false}={}){
    const high=['high','critical'].includes(risk), threshold=high?this.highImpactThreshold:this.normalThreshold;
    const reasons=[]; if(confidence<threshold)reasons.push('LOW_CONFIDENCE'); if(unresolvedAssumptions>0)reasons.push('UNRESOLVED_ASSUMPTIONS'); if(counterEvidence>0)reasons.push('COUNTER_EVIDENCE'); if(high&&!rollbackCheckpoint)reasons.push('NO_ROLLBACK_CHECKPOINT');
    return {action:reasons.length?'REVIEW':'PROCEED',threshold,reasons,confidence,risk};
  }
}

export class FormalConstraintGate {
  evaluate({obligations=[]}={}){
    const findings=[];
    for(const o of obligations){
      if(o.required!==false && o.status!=='VERIFIED') findings.push({id:o.id,status:o.status??'UNKNOWN',code:'UNVERIFIED_OBLIGATION'});
    }
    return {allowed:findings.length===0,findings,scope:'DECLARED_PROOF_OBLIGATIONS',bugFreeByDesignClaimed:false};
  }
}

export class ReplicaDiversifier {
  constructor({maxReplicas=8}={}){ this.maxReplicas=Math.max(1,maxReplicas); }
  plan({baseId='baseline',count=3,strategies=[]}={}){
    const n=Math.min(this.maxReplicas,Math.max(1,count));
    const defaults=['latency','memory','correctness','simplicity','energy','robustness','cost','portability'];
    return Array.from({length:n},(_,i)=>({id:`${baseId}-replica-${i+1}`,seed:i+1,strategy:strategies[i]??defaults[i%defaults.length],isolated:true,persistentSelfReplication:false}));
  }
}
