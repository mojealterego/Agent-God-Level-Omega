import { resolve, join, dirname, extname } from 'node:path';
import { readFile, writeFile, mkdir, rename, mkdtemp, rm, stat, open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  ClinicalJudgmentGate, CostEstimator, PrecisionEngine, MultisensoryFusion,
  InstallationPlanner3D, LegalContextGate, AffectivePolicy, IncidentManager,
  RawInputInspector, PhaseSynchronizer, CellularEvolutionMemory, EmotionalHomeostasis,
  SpeciousPresent, DurationSense, MasterGoalPolicy, TemporalGapDetector, TrendTracker,
  MqttParser, CoapParser, FixParser, CharacterConsistency, DomainEvidencePolicy,
  MeasurementInterpreter, EngineeringConstraintSolver, EditorState
} from './practical-architecture.mjs';

async function readJson(path,fallback){ try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;} }
async function writeJsonAtomic(path,value){ await mkdir(dirname(path),{recursive:true}); const tmp=`${path}.${process.pid}.${Date.now()}.tmp`; await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8'); await rename(tmp,path); }
function opCompare(value,condition={}){ const target=Number(condition.value); if(condition.op==='gt')return Number(value)>target;if(condition.op==='gte')return Number(value)>=target;if(condition.op==='lt')return Number(value)<target;if(condition.op==='lte')return Number(value)<=target;if(condition.op==='eq')return value===condition.value;return false; }

export class PracticalArchitectureRuntime {
  constructor({root,python='python3',commandRunner=null,env=process.env}={}){
    if(!root) throw new Error('root is required');
    this.root=resolve(root);this.python=python;this.commandRunner=commandRunner;this.env=env;
    this.artifactScript=resolve(new URL('../../runtime/practical_artifacts.py',import.meta.url).pathname);
    this.personalizationPath=join(this.root,'.omega','personalization.json');
    this.kbPath=join(this.root,'.omega','dynamic-knowledge.json');
    this.watchPath=join(this.root,'.omega','watches.json');
    this.characterPath=join(this.root,'.omega','characters.json');
    this.editorStates=new Map();
    this.present=new SpeciousPresent({windowMs:3000});
    this.duration=new DurationSense();
    this.homeostasis=new EmotionalHomeostasis();
    this.cellular=new CellularEvolutionMemory({width:8,height:8});
    this.trend=new TrendTracker();
  }
  #inside(path){const p=resolve(path);if(!(p===this.root||p.startsWith(this.root+'/')))throw new Error(`Path outside root: ${path}`);return p;}
  async #pythonRequest(req){
    const temp=await mkdtemp(join(this.root,'.omega-request-')); const request=join(temp,'request.json');
    try{
      await writeFile(request,JSON.stringify(req),'utf8');
      const out=await new Promise((res,rej)=>{
        const c=spawn(this.python,[this.artifactScript,'--request',request],{cwd:this.root,env:{...process.env,...this.env},stdio:['ignore','pipe','pipe']});let so='',se='';
        c.stdout.on('data',d=>so+=d);c.stderr.on('data',d=>se+=d);c.on('error',rej);c.on('close',code=>{let parsed;try{parsed=JSON.parse(so.trim())}catch{parsed={ok:false,error:se||so||`exit ${code}`}}; if(code===0&&parsed.ok!==false)res(parsed);else rej(new Error(parsed.error??se??`python exit ${code}`));});
      }); return out;
    } finally { await rm(temp,{recursive:true,force:true}).catch(()=>{}); }
  }
  async action(input){
    const p=input.payload??{};
    switch(input.action){
      case 'clinical-judge': return new ClinicalJudgmentGate().assess(p);
      case 'cost-estimate': return new CostEstimator().estimate(p);
      case 'tolerance-stack': return new PrecisionEngine().stack(p.parts??[]);
      case 'measurement-interpret': return new MeasurementInterpreter().interpret(p);
      case 'multisensory-fuse': return new MultisensoryFusion().fuse(p.observations??[]);
      case 'installation-check': return new InstallationPlanner3D().check(p);
      case 'legal-context': return new LegalContextGate().evaluate(p);
      case 'affective-policy': return new AffectivePolicy().select(p);
      case 'incident-classify': return new IncidentManager().classify(p);
      case 'raw-inspect': return new RawInputInspector().inspect(Buffer.from(p.bytes??[]));
      case 'phase-sync': return new PhaseSynchronizer().estimate(p.samples??[]);
      case 'cellular-seed': this.cellular.seed(p.cells??[]); return {seeded:(p.cells??[]).length};
      case 'cellular-evolve': return this.cellular.evolve(p);
      case 'emotional-homeostasis': return this.homeostasis.update(p);
      case 'present-add': return this.present.add(p.event);
      case 'present-snapshot': return this.present.snapshot(p.now??Date.now());
      case 'duration-start': return this.duration.start(p.id,p.at??Date.now());
      case 'duration-stop': return this.duration.stop(p.id,p.at??Date.now());
      case 'goal-evaluate': return new MasterGoalPolicy({goal:p.goal,invariants:p.invariants??[]}).evaluate(p.candidate??{});
      case 'temporal-gaps': return new TemporalGapDetector().detect(p.timestamps??[],p.options??{});
      case 'trend-add': this.trend.add(p.row); return this.trend.stats();
      case 'trend-stats': return this.trend.stats();
      case 'mqtt-parse': return new MqttParser().parse(Buffer.from(p.bytes??[]));
      case 'coap-parse': return new CoapParser().parse(Buffer.from(p.bytes??[]));
      case 'fix-parse': return new FixParser().parse(p.text??'');
      case 'character-compare': return new CharacterConsistency().compare(p.a??[],p.b??[]);
      case 'domain-evidence': return new DomainEvidencePolicy().evaluate(p);
      case 'engineering-rank': return new EngineeringConstraintSolver().rank(p);
      case 'editor-open': {const e=new EditorState({text:p.text??''});this.editorStates.set(p.id,e);return {id:p.id,revision:0,text:e.text};}
      case 'editor-patch': {const e=this.editorStates.get(p.id);if(!e)throw new Error(`Unknown editor ${p.id}`);return e.patch(p);}
      case 'personalization-set': return await this.#personalizationSet(p);
      case 'personalization-get': return await this.#personalizationGet(p);
      case 'knowledge-upsert': return await this.#knowledgeUpsert(p.record);
      case 'knowledge-query': return await this.#knowledgeQuery(p);
      case 'watch-register': return await this.#watchRegister(p.watch);
      case 'watch-list': return Object.values((await readJson(this.watchPath,{version:1,watches:{}})).watches);
      case 'watch-tick': return await this.#watchTick(p);
      case 'largefile-scan': return await this.#largefileScan(p);
      case 'document-doctor': return await this.#pythonRequest({operation:'doctor'});
      case 'document-generate': return await this.#documentGenerate(p);
      case 'scientific-inspect': return await this.#scientificInspect(p);
      case 'video-timeline-plan': return this.#videoPlan(p);
      case 'video-render': return await this.#videoRender(p);
      case 'build-plan': return this.#buildPlan(p);
      case 'build-execute': return await this.#buildExecute(p);
      case 'filesystem-readonly': return await this.#filesystemReadonly(p);
      case 'raw-photo-plan': return this.#rawPhotoPlan(p);
      case 'color-cms-plan': return this.#colorPlan(p);
      case 'color-cms-execute': return await this.#colorExecute(p);
      case 'character-register': return await this.#characterRegister(p);
      case 'character-get': return await this.#characterGet(p.id);
      case 'capability-boundary': return this.#capabilityBoundary(p.name);
      default: throw new Error(`Unsupported practical action: ${input.action}`);
    }
  }
  async #personalizationSet({key,value}){if(!key)throw new Error('key is required');const s=await readJson(this.personalizationPath,{version:1,values:{}});s.values[key]=value;await writeJsonAtomic(this.personalizationPath,s);return {key,value,productMemoryClaimed:false};}
  async #personalizationGet({key}){const s=await readJson(this.personalizationPath,{version:1,values:{}});return {key,value:s.values[key]??null,productMemoryClaimed:false};}
  async #knowledgeUpsert(record){if(!record?.id)throw new Error('record id required');const s=await readJson(this.kbPath,{version:1,records:{}});s.records[record.id]={...record,updatedAt:new Date().toISOString()};await writeJsonAtomic(this.kbPath,s);return s.records[record.id];}
  async #knowledgeQuery({domain=null,at=null,text=null}={}){const s=await readJson(this.kbPath,{version:1,records:{}});const t=at?Date.parse(at):null;const q=String(text??'').toLowerCase();const records=Object.values(s.records).filter(r=>{if(domain&&r.domain!==domain)return false;if(t!=null){if(r.validFrom&&Date.parse(r.validFrom)>t)return false;if(r.validTo&&Date.parse(r.validTo)<=t)return false;}if(q&&!String(r.text??'').toLowerCase().includes(q))return false;return true;});return {records};}
  async #watchRegister(watch){if(!watch?.id)throw new Error('watch id required');const s=await readJson(this.watchPath,{version:1,watches:{}});s.watches[watch.id]={...watch,lastState:null,updatedAt:new Date().toISOString()};await writeJsonAtomic(this.watchPath,s);return {...s.watches[watch.id],backgroundDaemonClaimed:false};}
  async #watchTick({id,observed,at=new Date().toISOString()}){const s=await readJson(this.watchPath,{version:1,watches:{}});const w=s.watches[id];if(!w)throw new Error(`Unknown watch ${id}`);const triggered=opCompare(observed,w.condition);w.lastState={observed,at,triggered};w.updatedAt=at;await writeJsonAtomic(this.watchPath,s);return {id,triggered,observed,at,backgroundDaemonClaimed:false};}
  async #largefileScan({path,chunkBytes=1024*1024}={}){const p=this.#inside(path);const st=await stat(p);if(!st.isFile())throw new Error('path must be file');const h=createHash('sha256');const f=await open(p,'r');let pos=0,chunks=0;try{const size=Math.max(4096,Math.min(16*1024*1024,Number(chunkBytes)||1024*1024));const buf=Buffer.alloc(size);while(true){const {bytesRead}=await f.read(buf,0,size,pos);if(!bytesRead)break;h.update(buf.subarray(0,bytesRead));pos+=bytesRead;chunks++;}}finally{await f.close();}return {path:p,bytes:pos,chunks,sha256:h.digest('hex'),streamed:true};}
  async #documentGenerate({format,output,spec={}}){const out=this.#inside(output);const op={docx:'docx',pdf:'pdf',xlsx:'xlsx',pptx:'pptx'}[format];if(!op)throw new Error(`Unsupported document format ${format}`);return await this.#pythonRequest({operation:op,output:out,...spec});}
  async #scientificInspect({kind,path,maxItems=1000,maxRecords=100000}){const p=this.#inside(path);if(kind==='h5')return await this.#pythonRequest({operation:'h5-summary',path:p,maxItems});if(kind==='sequence')return await this.#pythonRequest({operation:'sequence-summary',path:p,maxRecords});throw new Error(`Unsupported scientific kind ${kind}`);}
  #videoPlan({segments=[],output='out.mp4'}={}){return {engine:'ffmpeg',segments:segments.map((s,i)=>({index:i,path:s.path,start:Number(s.start??0),duration:s.duration==null?null:Number(s.duration)})),output,rendered:false,note:'Timeline planning only; rendering requires ffmpeg execution with accessible input files.'};}
  async #videoRender({segments=[],output='out.mp4',ffmpeg='ffmpeg'}={}){
    if(!this.commandRunner) return {available:false,reason:'NO_COMMAND_RUNNER'};
    if(!segments.length) throw new Error('segments must not be empty');
    const out=this.#inside(output); const argv=[ffmpeg,'-y']; const filters=[];
    for(const [i,s] of segments.entries()){ const path=this.#inside(s.path); argv.push('-i',path); const start=Math.max(0,Number(s.start??0)); const duration=s.duration==null?null:Math.max(0,Number(s.duration)); let vf=`[${i}:v]trim=start=${start}`; let af=`[${i}:a]atrim=start=${start}`; if(duration!=null){vf+=`:duration=${duration}`;af+=`:duration=${duration}`;} vf+=`,setpts=PTS-STARTPTS[v${i}]`;af+=`,asetpts=PTS-STARTPTS[a${i}]`;filters.push(vf,af); }
    const inputs=segments.map((_,i)=>`[v${i}][a${i}]`).join(''); filters.push(`${inputs}concat=n=${segments.length}:v=1:a=1[vout][aout]`); argv.push('-filter_complex',filters.join(';'),'-map','[vout]','-map','[aout]',out);
    const result=await this.commandRunner({argv,cwd:this.root,sideEffect:'L',timeoutMs:600000,maxOutputBytes:2097152}); return {available:true,engine:'ffmpeg',output:out,result};
  }
  #buildPlan({kind,projectDir='.'}={}){if(kind==='apk')return {kind,argv:['./gradlew','assembleRelease'],cwd:projectDir,requiresExternalToolchain:true};if(kind==='aab')return {kind,argv:['./gradlew','bundleRelease'],cwd:projectDir,requiresExternalToolchain:true};if(kind==='msi')return {kind,toolchains:['WiX','wixl','NSIS'],requiresExternalToolchain:true};if(kind==='dmg')return {kind,toolchains:['hdiutil','pkgbuild','productbuild'],requiresExternalToolchain:true};if(kind==='exe')return {kind,toolchains:['NSIS','WiX','Inno Setup'],requiresExternalToolchain:true};throw new Error(`Unsupported build kind ${kind}`);}
  async #buildExecute(p){ if(!this.commandRunner)return {available:false,reason:'NO_COMMAND_RUNNER'}; const plan=this.#buildPlan(p); if(!plan.argv)return {...plan,available:false,reason:'TOOLCHAIN_SPECIFIC_BUILD_REQUIRES_PROVIDER'}; const cwd=this.#inside(p.projectDir??'.'); const result=await this.commandRunner({argv:plan.argv,cwd,sideEffect:'L',timeoutMs:p.timeoutMs??900000,maxOutputBytes:4194304}); return {...plan,available:true,result}; }
  async #filesystemReadonly({kind,path='.'}={}){ if(!this.commandRunner)return {available:false,reason:'NO_COMMAND_RUNNER'}; const cwd=this.#inside(path); let argv; if(kind==='zfs')argv=['zfs','list','-H','-o','name,used,avail,refer,mountpoint']; else if(kind==='btrfs')argv=['btrfs','subvolume','list','-o',cwd]; else throw new Error('kind must be zfs or btrfs'); try{const result=await this.commandRunner({argv,cwd,sideEffect:'R',timeoutMs:120000,maxOutputBytes:1048576});return {available:result.exitCode===0,kind,result,rawPartitionRead:false};}catch(e){return {available:false,kind,reason:e?.code==='ENOENT'?'TOOL_UNAVAILABLE':String(e.message??e),rawPartitionRead:false};}}
  #rawPhotoPlan({input,output,iccProfile=null}={}){return {input,output,iccProfile,preferredTools:['darktable-cli','rawtherapee-cli','dcraw','ImageMagick'],requiresRawProcessor:true,adobeAutomationAvailable:false,adobeNote:'Photoshop/Lightroom require an actual connected Adobe automation surface; this runtime can only emit recipes/sidecars.'};}
  #colorPlan({inputProfile,outputProfile,intent='perceptual'}={}){return {inputProfile,outputProfile,intent,requiresIccEngine:true,preferredTools:['ImageMagick','LittleCMS'],cmsClaimedOnlyIfExecuted:true};}
  async #colorExecute({input,output,inputProfile=null,outputProfile=null,intent='perceptual',magick='magick'}={}){ if(!this.commandRunner)return {available:false,reason:'NO_COMMAND_RUNNER'}; const src=this.#inside(input),dst=this.#inside(output); const argv=[magick,src]; if(inputProfile)argv.push('-profile',this.#inside(inputProfile)); if(outputProfile)argv.push('-intent',intent,'-profile',this.#inside(outputProfile)); argv.push(dst); const result=await this.commandRunner({argv,cwd:this.root,sideEffect:'L',timeoutMs:300000,maxOutputBytes:1048576}); return {available:result.exitCode===0,output:dst,result}; }
  async #characterRegister({id,embedding,metadata={}}){if(!id||!Array.isArray(embedding))throw new Error('id and embedding required');const s=await readJson(this.characterPath,{version:1,characters:{}});s.characters[id]={id,embedding,metadata,updatedAt:new Date().toISOString()};await writeJsonAtomic(this.characterPath,s);return {id,stored:true,identityProven:false};}
  async #characterGet(id){const s=await readJson(this.characterPath,{version:1,characters:{}});return s.characters[id]??null;}
  #capabilityBoundary(name){const known={P_VS_NP:{status:'UNSOLVED_PROBLEM'},GODEL_ESCAPE:{status:'NOT_CLAIMED'},BTS_LISTENING:{status:'NOT_IMPLEMENTED_UNAUTHORIZED_INTERCEPTION'},DEEPFAKE_PORN:{status:'NOT_IMPLEMENTED_NONCONSENSUAL_RISK'},UIR:{status:'UNDEFINED_TERM'},MSDIN:{status:'UNDEFINED_TERM'}};return known[String(name??'').toUpperCase()]??{status:'UNKNOWN_CAPABILITY'};}
}
