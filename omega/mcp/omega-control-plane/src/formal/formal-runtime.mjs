import { join, resolve } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import {
  FiniteCategory, FunctorVerifier, BelnapLogic, LukasiewiczLogic, EpistemicDefragmenter,
  PortableIrCompiler, FiniteStateVerifier, SubstrateExperimentPlanner, HybridComputeRouter,
  EnergyBudgetGovernor, ConstitutionManifest, AlignmentRegressionGate, FallibilismGate,
  FormalConstraintGate, ReplicaDiversifier
} from './formal-epistemic-architecture.mjs';

async function readJson(path,fallback){ try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;} }
async function writeJsonAtomic(path,value){ await mkdir(resolve(path,'..'),{recursive:true}); const tmp=`${path}.${process.pid}.${Date.now()}.tmp`; await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8'); await rename(tmp,path); }

export class AssumptionLedger {
  constructor({filePath}={}){ if(!filePath) throw new Error('filePath is required'); this.filePath=filePath; }
  async add(record){ if(!record?.id) throw new Error('assumption id is required'); const s=await readJson(this.filePath,{version:1,records:{}}); const now=new Date().toISOString(); const item={status:'OPEN',confidence:0,...record,createdAt:s.records[record.id]?.createdAt??now,updatedAt:now}; s.records[item.id]=item; await writeJsonAtomic(this.filePath,s); return item; }
  async resolve(id,{status='RESOLVED',evidence=[]}={}){ const s=await readJson(this.filePath,{version:1,records:{}}); if(!s.records[id]) throw new Error(`Unknown assumption ${id}`); s.records[id]={...s.records[id],status,evidence:[...new Set([...(s.records[id].evidence??[]),...evidence])],updatedAt:new Date().toISOString()}; await writeJsonAtomic(this.filePath,s); return s.records[id]; }
  async get(id){ const s=await readJson(this.filePath,{version:1,records:{}}); return s.records[id]??null; }
  async list({status=null}={}){ const s=await readJson(this.filePath,{version:1,records:{}}); return Object.values(s.records).filter(x=>!status||x.status===status); }
}

export class FormalEpistemicRuntime {
  constructor({root,sandboxRunner=null}={}){
    if(!root) throw new Error('root is required'); this.root=resolve(root); this.sandboxRunner=sandboxRunner;
    this.assumptions=new AssumptionLedger({filePath:join(this.root,'.omega','assumptions.json')});
  }
  async action(input){
    const p=input.payload??{};
    switch(input.action){
      case 'category-verify': return new FiniteCategory(p).verify();
      case 'functor-verify': {
        const source=new FiniteCategory(p.source??{}), target=new FiniteCategory(p.target??{});
        return new FunctorVerifier().verify({source,target,objectMap:p.objectMap??{},morphismMap:p.morphismMap??{}});
      }
      case 'belnap': {
        const b=new BelnapLogic(); if(p.operation==='from-evidence')return b.fromEvidence(p); const a=b.value(p.a); if(p.operation==='not')return b.not(a); const bb=b.value(p.b); if(p.operation==='and')return b.and(a,bb); if(p.operation==='or')return b.or(a,bb); throw new Error('Unsupported Belnap operation');
      }
      case 'lukasiewicz': { const l=new LukasiewiczLogic(); if(p.operation==='not')return {value:l.not(p.a)}; if(p.operation==='and')return {value:l.and(p.a,p.b)}; if(p.operation==='or')return {value:l.or(p.a,p.b)}; if(p.operation==='implies')return {value:l.implies(p.a,p.b)}; throw new Error('Unsupported Lukasiewicz operation'); }
      case 'epistemic-defrag': return new EpistemicDefragmenter(p.options??{}).scan(p.records??[]);
      case 'ir-compile': return {target:p.target,source:new PortableIrCompiler().compile(p.ir,p.target),universalTranspilationClaimed:false};
      case 'fsm-verify': return this.#fsmVerify(p);
      case 'formal-gate': return new FormalConstraintGate().evaluate(p);
      case 'substrate-rank': return new SubstrateExperimentPlanner().rank(p);
      case 'hybrid-route': return new HybridComputeRouter().route(p);
      case 'energy-evaluate': return new EnergyBudgetGovernor().evaluate(p);
      case 'energy-rank': return new EnergyBudgetGovernor().rank(p.candidates??[]);
      case 'constitution-snapshot': return new ConstitutionManifest({rules:p.rules??[]}).snapshot();
      case 'alignment-gate': return new AlignmentRegressionGate().evaluate(p);
      case 'fallibilism-gate': return new FallibilismGate(p.options??{}).decide(p);
      case 'assumption-add': return await this.assumptions.add(p.record);
      case 'assumption-resolve': return await this.assumptions.resolve(p.id,p.update??{});
      case 'assumption-get': return await this.assumptions.get(p.id);
      case 'assumption-list': return await this.assumptions.list(p);
      case 'replica-plan': return new ReplicaDiversifier(p.options??{}).plan(p);
      case 'replica-tournament': return await this.#replicaTournament(p);
      default: throw new Error(`Unsupported formal-epistemic action: ${input.action}`);
    }
  }
  #fsmVerify(p){
    const forbidden=new Set(p.forbiddenStates??[]);
    const invariants=(p.invariants??[]).map(i=>({id:i.id,check:(state)=> i.allowedStates ? i.allowedStates.includes(state) : !forbidden.has(state)}));
    if(!invariants.length&&forbidden.size) invariants.push({id:'forbidden-states',check:s=>!forbidden.has(s)});
    return new FiniteStateVerifier({maxStates:p.maxStates??10000}).verify({initial:p.initial,transitions:p.transitions??{},invariants});
  }
  async #replicaTournament({baseline,candidates=[],objectives=[],hardGates=[],maxReplicas=8,image='node:22-alpine',engine='docker',memory='1g',cpus='1'}={}){
    if(!this.sandboxRunner) return {available:false,reason:'NO_SANDBOX_PROVIDER'};
    if(candidates.length>maxReplicas) throw new Error(`Replica limit exceeded: ${candidates.length} > ${maxReplicas}`);
    const run=async candidate=>{
      const result=await this.sandboxRunner({engine,image:candidate.image??image,workspace:this.root,command:candidate.command,writable:false,network:'none',memory,cpus,env:{OMEGA_REPLICA_SEED:String(candidate.seed??0),...(candidate.env??{})},timeoutMs:candidate.timeoutMs??120000});
      let metrics={errors:1}; if(result.exitCode===0){ try{metrics=JSON.parse(String(result.stdout??'').trim());}catch{metrics={errors:1,invalidMetrics:true};} }
      return {...candidate,metrics,execution:{exitCode:result.exitCode,durationMs:result.durationMs}};
    };
    const measuredBaseline=await run(baseline); const measured=[]; for(const candidate of candidates) measured.push(await run(candidate));
    const eligible=measured.filter(c=>hardGates.every(g=>{const v=Number(c.metrics?.[g.key]); return (g.min==null||v>=g.min)&&(g.max==null||v<=g.max);}));
    const all=[measuredBaseline,...eligible];
    const score=c=>objectives.reduce((s,o)=>s+(o.direction==='min'?-1:1)*Number(c.metrics?.[o.key]??0)*Number(o.weight??1),0);
    all.sort((a,b)=>score(b)-score(a)); const winner=all[0];
    return {available:true,baseline:measuredBaseline,candidates:measured,winner,mergeEligible:winner.id!==measuredBaseline.id&&winner.execution.exitCode===0,persistentSelfReplication:false};
  }
}
