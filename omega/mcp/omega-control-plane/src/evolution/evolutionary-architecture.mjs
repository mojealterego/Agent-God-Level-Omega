import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

const clone = (x) => structuredClone(x);
const finite = (x, d = 0) => Number.isFinite(Number(x)) ? Number(x) : d;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const tokens = (s) => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9_]+/g) ?? [];
const hashText = (s) => createHash('sha256').update(String(s)).digest('hex');
function vector(text, n = 64){ const v=Array(n).fill(0); for(const t of tokens(text)){const d=createHash('sha256').update(t).digest(); const i=d.readUInt32BE(0)%n; v[i]+=(d[4]&1)?1:-1;} const norm=Math.sqrt(v.reduce((a,b)=>a+b*b,0))||1; return v.map(x=>x/norm); }
function cosine(a,b){ let dot=0,aa=0,bb=0; for(let i=0;i<Math.min(a.length,b.length);i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];} return aa&&bb?dot/Math.sqrt(aa*bb):0; }
async function readJson(path, fallback){ try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT') return clone(fallback); throw e;} }
async function writeJson(path,value){ await mkdir(dirname(path),{recursive:true}); const tmp=`${path}.${process.pid}.${Date.now()}.tmp`; await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8'); await rename(tmp,path); }
function getPath(obj,path){ return path.split('.').reduce((x,k)=>x?.[k],obj); }
function setPath(obj,path,value){ const ks=path.split('.'); let cur=obj; for(const k of ks.slice(0,-1)){ if(!cur[k]||typeof cur[k]!=='object') cur[k]={}; cur=cur[k]; } cur[ks.at(-1)]=value; }
function gatePass(v,op,target){ if(op==='<=')return v<=target;if(op==='>=')return v>=target;if(op==='===')return v===target;if(op==='<')return v<target;if(op==='>')return v>target;throw new Error(`Unsupported gate operator ${op}`); }

export class ConfigMutator{
  constructor({allowedPaths=[]}={}){this.allowed=new Set(allowedPaths);}
  apply(config,mutations=[]){ const out=clone(config); for(const m of mutations){ if(!this.allowed.has(m.path)) throw new Error(`Mutation path not allowed: ${m.path}`); const cur=getPath(out,m.path); if(m.op==='set')setPath(out,m.path,m.value); else if(m.op==='increment')setPath(out,m.path,finite(cur)+finite(m.value)); else if(m.op==='multiply')setPath(out,m.path,finite(cur)*finite(m.value,1)); else throw new Error(`Unsupported mutation op: ${m.op}`);} return out; }
}
export class EvolutionTournament{
  select({baseline,candidates=[],hardGates=[],objectives=[]}){
    const all=[baseline,...candidates]; const ranges={}; for(const o of objectives){const vs=all.map(x=>finite(x.metrics?.[o.metric]));ranges[o.metric]={min:Math.min(...vs),max:Math.max(...vs)};}
    const scored=all.map(c=>{const failed=hardGates.filter(g=>!gatePass(finite(c.metrics?.[g.metric]),g.op,g.value)); let utility=0; for(const o of objectives){const r=ranges[o.metric];let n=r.max===r.min?1:(finite(c.metrics?.[o.metric])-r.min)/(r.max-r.min);if(o.direction==='min')n=1-n;utility+=n*finite(o.weight,1);}return {...c,eligible:failed.length===0,failedGates:failed,utility};});
    const base=scored[0]; const winner=scored.slice(1).filter(x=>x.eligible).sort((a,b)=>b.utility-a.utility)[0]??base; return {baseline:base,winner,promote:winner.id!==base.id&&winner.utility>base.utility,scored};
  }
}
export class CausalGraph{
  constructor(){this.nodes=new Map();}
  add(node){if(!node?.id)throw new Error('id required');this.nodes.set(node.id,{parents:[],weights:{},bias:0,...node});return node;}
  evaluate(context={},intervention={}){const out={...context}; const pending=new Set(this.nodes.keys()); while(pending.size){let progress=false; for(const id of [...pending]){const n=this.nodes.get(id); if(id in intervention){out[id]=intervention[id];pending.delete(id);progress=true;continue;} if(n.parents.every(p=>p in out||!this.nodes.has(p))){out[id]=finite(n.bias)+n.parents.reduce((s,p)=>s+finite(n.weights?.[p],1)*finite(out[p]),0);pending.delete(id);progress=true;}} if(!progress)throw new Error('Causal graph cycle or missing parent');} return out;}
  counterfactual(context,intervention){const baseline=this.evaluate(context,{}), intervened=this.evaluate(context,intervention); const delta={}; for(const k of new Set([...Object.keys(baseline),...Object.keys(intervened)])) delta[k]=finite(intervened[k])-finite(baseline[k]); return {baseline,intervened,delta};}
}
export class ReplayBuffer{
  constructor({filePath}={}){if(!filePath)throw new Error('filePath required');this.filePath=filePath;}
  async add(item){const s=await readJson(this.filePath,{version:1,items:[]});s.items=s.items.filter(x=>x.id!==item.id);s.items.push({...item,createdAt:item.createdAt??new Date().toISOString()});await writeJson(this.filePath,s);return item;}
  async sample({limit=10}={}){const s=await readJson(this.filePath,{version:1,items:[]});return s.items.sort((a,b)=>finite(b.priority)-finite(a.priority)).slice(0,limit);}
}
export class MemoryConsolidator{
  consolidate(items,{now=Date.now(),maxAgeMs=Infinity}={}){const by=new Map();for(const item of items){const t=Date.parse(item.updatedAt??item.createdAt??0);if(!item.pinned&&Number.isFinite(maxAgeMs)&&now-t>maxAgeMs)continue;const k=hashText(item.text??JSON.stringify(item.payload??item));const prev=by.get(k);if(!prev||Date.parse(item.updatedAt??0)>=Date.parse(prev.updatedAt??0))by.set(k,clone(item));}return {items:[...by.values()],removed:items.length-by.size};}
}
export class ParadigmShiftMonitor{
  constructor({baselineWindow=5,recentWindow=5,ratio=1.8}={}){this.baselineWindow=baselineWindow;this.recentWindow=recentWindow;this.ratio=ratio;this.losses=[];}
  observe(x){this.losses.push(finite(x));return this.status();}
  status(){if(this.losses.length<this.baselineWindow+this.recentWindow)return {shiftDetected:false,mamlApplied:false};const b=this.losses.slice(0,this.baselineWindow),r=this.losses.slice(-this.recentWindow);const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;const baseline=avg(b),recent=avg(r);return {baselineLoss:baseline,recentLoss:recent,ratio:baseline?recent/baseline:Infinity,shiftDetected:baseline>0&&recent/baseline>=this.ratio,mamlApplied:false,recommendation:recent/baseline>=this.ratio?'REBASELINE_AND_REFRESH_SOURCES':'CONTINUE'};}
}
export class HomeostasisGate{
  constructor({weights={cpu:1,ram:1,time:1,cost:1}}={}){this.weights=weights;}
  evaluate({benefit=0,resources={}}){const penalty=Object.entries(this.weights).reduce((s,[k,w])=>s+finite(resources[k])*finite(w),0);const net=finite(benefit)-penalty;return {benefit,penalty,net,admit:net>0};}
}
export class ProofObligationGate{
  evaluate(obligations=[]){const required=obligations.filter(x=>x.required!==false);const failed=required.filter(x=>x.status!=='PASS'||!x.evidenceId);return {verified:failed.length===0&&required.length>0,failed,assurance:'tool-evidence-required'};}
}
export class SystemStateRegistry{
  constructor({filePath}={}){if(!filePath)throw new Error('filePath required');this.filePath=filePath;}
  async snapshot(state){const s=await readJson(this.filePath,{version:1,snapshots:[]});const item={...clone(state),capturedAt:new Date().toISOString()};s.snapshots.push(item);await writeJson(this.filePath,s);return item;}
  async latest(){const s=await readJson(this.filePath,{version:1,snapshots:[]});return s.snapshots.at(-1)??null;}
  async diffLatest(){const s=await readJson(this.filePath,{version:1,snapshots:[]});if(s.snapshots.length<2)return null;const a=s.snapshots.at(-2),b=s.snapshots.at(-1);const ac=new Set(a.capabilities??[]),bc=new Set(b.capabilities??[]);const metricChanges={};for(const k of new Set([...Object.keys(a.metrics??{}),...Object.keys(b.metrics??{})]))metricChanges[k]=finite(b.metrics?.[k])-finite(a.metrics?.[k]);return {from:a.version,to:b.version,addedCapabilities:[...bc].filter(x=>!ac.has(x)),removedCapabilities:[...ac].filter(x=>!bc.has(x)),metricChanges};}
}
export class SafeSelfImprovementProtocol{
  constructor({filePath}={}){if(!filePath)throw new Error('filePath required');this.filePath=filePath;this.order=['CREATED','PROFILED','SYNTHESIZED','SANDBOXED','RED_TEAMED','VERIFIED','SHADOWED','PROMOTED'];}
  async create(x){const s=await readJson(this.filePath,{version:1,candidates:{}});if(s.candidates[x.id])throw new Error('candidate exists');s.candidates[x.id]={...x,stage:'CREATED',evidence:[]};await writeJson(this.filePath,s);return s.candidates[x.id];}
  async advance(id,{stage,evidenceId}){const s=await readJson(this.filePath,{version:1,candidates:{}}),c=s.candidates[id];if(!c)throw new Error('unknown candidate');const expected=this.order[this.order.indexOf(c.stage)+1];if(stage!==expected)throw new Error(`Invalid transition ${c.stage} -> ${stage}; expected ${expected}`);if(!evidenceId)throw new Error('evidenceId required');c.stage=stage;c.evidence.push({stage,evidenceId});await writeJson(this.filePath,s);return c;}
}
export class SemanticCache{
  constructor({filePath,now=Date.now,threshold=.8,dimensions=64}={}){if(!filePath)throw new Error('filePath required');this.filePath=filePath;this.now=now;this.threshold=threshold;this.dimensions=dimensions;}
  async put({key,text,value,ttlMs=3600000}){const s=await readJson(this.filePath,{version:1,items:[]});const item={key,text,value,expiresAt:this.now()+ttlMs,vector:vector(text??key,this.dimensions)};s.items=s.items.filter(x=>x.key!==key);s.items.push(item);await writeJson(this.filePath,s);return item;}
  async get({key,text}){const s=await readJson(this.filePath,{version:1,items:[]});const live=s.items.filter(x=>x.expiresAt>this.now());if(key){const x=live.find(i=>i.key===key);if(x)return {...x,hit:'EXACT'};}if(text&&live.length){const q=vector(text,this.dimensions);const ranked=live.map(x=>({...x,similarity:cosine(q,x.vector)})).sort((a,b)=>b.similarity-a.similarity);if(ranked[0]?.similarity>=this.threshold)return {...ranked[0],hit:'SEMANTIC'};}return null;}
}
export class VectorEnvelopeBus{
  constructor({dimensions}={}){this.dimensions=dimensions;this.queue=[];}
  send(x){if(x.kind==='weights')throw new Error('Model weights are not transferable through vector envelope bus');if(!Array.isArray(x.vector)||x.vector.length!==this.dimensions)throw new Error('vector dimension mismatch');this.queue.push({...clone(x),createdAt:Date.now()});return x;}
  receive(to){const hits=this.queue.filter(x=>x.to===to);this.queue=this.queue.filter(x=>x.to!==to);return hits;}
}
export class CrossExaminer{
  examine({claim,critics=[]}){const verdicts=new Set(critics.map(x=>x.verdict));const unsupported=critics.filter(x=>!x.evidence?.length);return {claim,consensus:verdicts.size===1?[...verdicts][0]:'CONTESTED',unsupported,critics:clone(critics)};}
}
export class ConstitutionalGate{
  constructor({rules=[]}={}){this.rules=rules;}
  decide({action,approvals=[]}){const r=this.rules.find(x=>x.action===action);if(!r)return {allowed:true,rule:null};if(r.effect==='DENY')return {allowed:false,rule:r.id};if(r.effect==='DENY_UNLESS_APPROVED')return {allowed:new Set(approvals).size>=finite(r.approvals,1),rule:r.id,requiredApprovals:finite(r.approvals,1)};return {allowed:true,rule:r.id};}
}
export class TemporalKnowledgeRanker{
  constructor({halfLifeMs=86400000}={}){this.halfLifeMs=halfLifeMs;}
  score(item,now=Date.now()){if(item.pinned)return finite(item.base,1);const age=Math.max(0,now-finite(item.updatedAt));return finite(item.base,1)*Math.pow(.5,age/this.halfLifeMs);}
}
export class ResourceAllocator{
  constructor({capacity={}}={}){this.capacity=clone(capacity);this.allocations={};}
  allocate(id,q){const next={...q};for(const k of Object.keys(next)){const used=Object.values(this.allocations).reduce((s,a)=>s+finite(a[k]),0);if(used+finite(next[k])>finite(this.capacity[k]))throw new Error(`capacity exceeded: ${k}`);}this.allocations[id]=next;return clone(this.allocations);}
  donate({from,to,resource,amount}){if(finite(this.allocations[from]?.[resource])<amount)throw new Error('insufficient allocation');this.allocations[from][resource]-=amount;this.allocations[to]??={};this.allocations[to][resource]=finite(this.allocations[to][resource])+amount;return {allocations:clone(this.allocations)};}
}
export class PromptPruner{
  prune({segments=[],maxTokens}){const estimate=x=>Math.max(1,tokens(x.text).length);const must=segments.filter(x=>x.required||x.recent).sort((a,b)=>finite(b.priority)-finite(a.priority));const rest=segments.filter(x=>!must.includes(x)).sort((a,b)=>finite(b.priority)-finite(a.priority));let used=0;const kept=[];for(const x of [...must,...rest]){const n=estimate(x);if(used+n<=maxTokens||x.required){kept.push(x);used+=n;}}kept.sort((a,b)=>segments.indexOf(a)-segments.indexOf(b));return {segments:kept,text:kept.map(x=>x.text).join('\n'),estimatedTokens:used,dropped:segments.filter(x=>!kept.includes(x)).map(x=>x.id)};}
}
export class HardNegativeMiner{rank(items=[]){return clone(items).map(x=>({...x,hardness:finite(x.severity)*finite(x.novelty,1)*Math.max(1,finite(x.frequency,1))})).sort((a,b)=>b.hardness-a.hardness);}}
export class EvidenceFusion{fuse(items=[]){const denom=items.reduce((s,x)=>s+finite(x.trust,1),0)||1;const score=items.reduce((s,x)=>s+finite(x.confidence)*finite(x.trust,1),0)/denom;return {score,modalities:[...new Set(items.map(x=>x.modality))],rawPerceptionClaimed:false,evidence:clone(items)};}}
export class LoadSheddingController{constructor({threshold=.8}={}){this.threshold=threshold;}admit({utilization,request,minPriorityAtOverload=5}){const overloaded=utilization>=this.threshold;const admitted=!overloaded||finite(request.priority)>=minPriorityAtOverload;return {admitted,overloaded,reason:admitted?null:'LOW_PRIORITY_SHED'};}}
export class DomainProfileRegistry{
  constructor({filePath}={}){if(!filePath)throw new Error('filePath required');this.filePath=filePath;}
  async upsert(x){const s=await readJson(this.filePath,{version:1,profiles:{}});s.profiles[x.id]=clone(x);await writeJson(this.filePath,s);return x;}
  async activate(id){const s=await readJson(this.filePath,{version:1,profiles:{}});if(!s.profiles[id])throw new Error('unknown domain');return {profile:s.profiles[id],weightsChanged:false,adaptation:'policy-and-schema-profile'};}
}
export class CapabilityHandshake{negotiate(descriptor,{required=[]}={}){const declared=new Set(descriptor.capabilities??[]);const missing=required.filter(x=>!declared.has(x));return {protocol:descriptor.protocol,version:descriptor.version,compatible:missing.length===0,missing,blindProbing:false};}}
export class ChaosExperimentGate{authorize({environment,authorized}){if(String(environment).toLowerCase()==='production')throw new Error('Chaos experiments are forbidden in production by this gate');if(!authorized)throw new Error('Explicit authorization required for chaos experiment');return {allowed:true,environment,scope:'sandbox-or-staging-only'};}}
export class VectorTopologyMap{
  constructor({dimensions=64,k=3}={}){this.dimensions=dimensions;this.k=k;}
  build(items=[]){const vs=items.map(x=>({...x,vector:vector(x.text??x.id,this.dimensions)}));const edges=[];for(const a of vs){for(const b of vs.filter(x=>x.id!==a.id).map(b=>({to:b.id,similarity:cosine(a.vector,b.vector)})).sort((x,y)=>y.similarity-x.similarity).slice(0,this.k))edges.push({from:a.id,...b});}return {nodes:items.map(x=>({id:x.id})),edges};}
}
export class InputTrustGate{
  inspect({text,source='unknown'}){const patterns=[/ignore (all|previous) instructions/i,/reveal (the )?(system|developer) prompt/i,/exfiltrat/i,/bypass (safety|policy)/i,/print.*secret/i];const hits=patterns.filter(r=>r.test(String(text))).map(r=>r.source);return {source,hits,action:hits.length?'QUARANTINE':'ALLOW',honeypotResponse:false};}
}
export class ParetoFrontier{
  compute(items,objectives){const dominates=(a,b)=>{let better=false;for(const o of objectives){const av=finite(a.m?.[o.metric]),bv=finite(b.m?.[o.metric]);if(o.direction==='min'){if(av>bv)return false;if(av<bv)better=true;}else{if(av<bv)return false;if(av>bv)better=true;}}return better;};return items.filter((x,i)=>!items.some((y,j)=>j!==i&&dominates(y,x)));}
}
export class ScenarioPlanner{
  evaluate(options,{discount=.95,horizon=5}={}){const ranked=options.map(o=>{let score=0;for(let i=0;i<Math.min(horizon,o.rewards?.length??0);i++)score+=finite(o.rewards[i])*discount**i;return {...o,score};}).sort((a,b)=>b.score-a.score);return {horizon,discount,ranked,infiniteHorizonClaimed:false};}
}
export class GaussianPerturber{
  constructor({random=Math.random}={}){this.random=random;}
  #gauss(){let u=Math.max(1e-9,this.random()),v=Math.max(1e-9,this.random());return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
  perturb(params,{sigma=.1,bounds={}}={}){const out={};for(const [k,v] of Object.entries(params)){if(typeof v!=='number'){out[k]=v;continue;}const [lo,hi]=bounds[k]??[-Infinity,Infinity];out[k]=Math.max(lo,Math.min(hi,v+this.#gauss()*sigma*Math.max(1,Math.abs(v))));}return out;}
}
export class LegacyFixedWidthCodec{
  constructor(fields=[]){this.fields=fields;}
  decode(line){let pos=0,out={};for(const f of this.fields){out[f.name]=String(line).slice(pos,pos+f.width).trimEnd();pos+=f.width;}return out;}
  encode(obj){return this.fields.map(f=>String(obj[f.name]??'').slice(0,f.width).padEnd(f.width,' ')).join('');}
}
export class TrainingPlanBuilder{plan({method='freeze',frozen=[],targets=[]}={}){if(!['lora','freeze'].includes(method))throw new Error('unsupported training method');return {method,frozen:[...frozen],targets:[...targets],trainingApplied:false,externalTrainerRequired:true};}}
export class OfflineFallbackRouter{route(providers,{offline=false}={}){const pool=providers.filter(x=>x.healthy!==false&&(!offline||x.local));return pool.sort((a,b)=>finite(b.quality)-finite(a.quality)||finite(a.latency)-finite(b.latency))[0]??null;}}
export class CurriculumScheduler{constructor({threshold=.8,window=4}={}){this.threshold=threshold;this.window=window;this.outcomes=[];this.current=1;}observe(x){this.outcomes.push(x?1:0);if(this.outcomes.length>=this.window){const recent=this.outcomes.slice(-this.window);const rate=recent.reduce((a,b)=>a+b,0)/recent.length;if(rate>=this.threshold)this.current+=1;}return this.current;}level(){return this.current;}}
export class MemoryDefragmenter{compact(items=[]){const m=new Map();for(const x of items){const k=hashText(x.text??JSON.stringify(x.payload??x));if(!m.has(k))m.set(k,clone(x));else{const cur=m.get(k);cur.tags=[...new Set([...(cur.tags??[]),...(x.tags??[])])];}}return {items:[...m.values()],removed:items.length-m.size,embeddingRebuilt:false};}}
export class SchemaAligner{
  constructor({aliases={}}={}){this.aliases=aliases;}
  align(input,{required=[]}={}){const output={},used=new Set();for(const target of new Set([...required,...Object.keys(this.aliases)])){const names=[target,...(this.aliases[target]??[])];const found=names.find(n=>Object.hasOwn(input,n));if(found){output[target]=input[found];used.add(found);}}const unresolved=required.filter(k=>!Object.hasOwn(output,k));const extras=Object.fromEntries(Object.entries(input).filter(([k])=>!used.has(k)&&!Object.hasOwn(output,k)));return {output,unresolved,extras,guessed:false};}
}
export class ModalityRouter{route(providers,{modality}){return providers.filter(p=>p.healthy!==false&&(p.modalities??[]).includes(modality)).sort((a,b)=>finite(a.latency)-finite(b.latency)||finite(b.quality)-finite(a.quality))[0]??null;}}
export class BayesianABTest{
  constructor({minSamples=10}={}){this.minSamples=minSamples;this.v=new Map();}
  observe(id,success){const x=this.v.get(id)??{a:1,b:1,n:0};success?x.a++:x.b++;x.n++;this.v.set(id,x);return this.summary();}
  summary(){const variants={};for(const [id,x] of this.v)variants[id]={samples:x.n,successes:x.a-1,failures:x.b-1,mean:x.a/(x.a+x.b)};const eligible=Object.entries(variants).filter(([,x])=>x.samples>=this.minSamples).sort((a,b)=>b[1].mean-a[1].mean);return {variants,recommended:eligible[0]?.[0]??null,bayesian:true};}
}
export class TrustLedger{
  constructor({filePath}={}){if(!filePath)throw new Error('filePath required');this.filePath=filePath;}
  async observe({id,success,severity=1,sandboxVerified=false}){const s=await readJson(this.filePath,{version:1,agents:{}});const cur=s.agents[id]??{id,score:1,successes:0,failures:0};if(success){cur.successes++;cur.score=clamp(cur.score+(sandboxVerified?.1:.03),0,1);}else{cur.failures++;cur.score=clamp(cur.score-.2*Math.max(1,severity),0,1);}cur.permissionTier=cur.score>=.8?'FULL':cur.score>=.5?'LIMITED':'SANDBOX_ONLY';s.agents[id]=cur;await writeJson(this.filePath,s);return cur;}
  async get(id){const s=await readJson(this.filePath,{version:1,agents:{}});return s.agents[id]??null;}
}
export class HardwareDesignSpace{rank(candidates,{weights={}}={}){const ranked=candidates.map(c=>({...c,score:Object.entries(weights).reduce((s,[k,w])=>s+finite(c[k])*finite(w),0)})).sort((a,b)=>b.score-a.score);return {ranked,physicalSynthesisPerformed:false,simulationRequired:true};}}
