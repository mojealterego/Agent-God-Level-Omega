import { access, readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { delimiter, dirname, join, resolve } from 'node:path';
import { SecretKnowledgeCatalog, CommandRiskClassifier, SafeDiagnosticPlanner, KnowledgePolicyGate } from './secret-knowledge-architecture.mjs';

async function readJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;}}
async function writeJsonAtomic(path,value){await mkdir(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.${Date.now()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');await rename(tmp,path);}

async function resolveBinary(binary,env=process.env){
  const suffixes=process.platform==='win32'?['','.exe','.cmd','.bat']:[''];
  for(const dir of String(env.PATH??'').split(delimiter).filter(Boolean))for(const suffix of suffixes){const p=join(dir,`${binary}${suffix}`);try{await access(p);return p;}catch{}}
  return null;
}

const INVENTORY=['bash','sh','curl','wget','openssl','ssh','sshd','dig','host','nslookup','getent','ip','ss','netstat','lsof','fuser','tcpdump','tshark','ngrep','strace','iostat','vmstat','perf','journalctl','systemctl','docker','podman','kubectl','lynis','auditctl','bpftrace','sysdig','goaccess','ngxtop','nmap','masscan','nikto','metasploit','msfconsole','sqlmap','mimikatz','hashcat','john','ghidra','radare2'];

export class SecretKnowledgeRuntime {
  constructor({root,commandRunner=null,env=process.env}={}){
    if(!root)throw new Error('root is required');this.root=resolve(root);this.commandRunner=commandRunner;this.env=env;
    this.catalog=new SecretKnowledgeCatalog();this.classifier=new CommandRiskClassifier();this.planner=new SafeDiagnosticPlanner({classifier:this.classifier});this.gate=new KnowledgePolicyGate({classifier:this.classifier});
    this.statePath=join(this.root,'.omega','secret-knowledge-v19.json');
  }
  async action({action,payload={}}={}){
    switch(action){
      case 'source-info': return this.catalog.source();
      case 'source-observe': return this.catalog.observeSource(payload);
      case 'catalog-list': return this.catalog.list(payload);
      case 'catalog-search': return this.catalog.search(payload.query??'');
      case 'catalog-upsert': return this.catalog.upsert(payload);
      case 'command-classify': return this.classifier.classify(payload.argv??payload.command??[]);
      case 'command-gate': return this.gate.evaluate(payload);
      case 'playbook-list': return this.planner.list();
      case 'playbook-plan': return this.planner.plan(payload);
      case 'diagnostic-run': return await this.#diagnosticRun(payload);
      case 'tool-inventory': return await this.#inventory(payload);
      case 'state-save': return await this.#save();
      case 'state-load': return await this.#load();
      default: throw new Error(`Unsupported secret knowledge action: ${action}`);
    }
  }
  async #diagnosticRun({playbook,target=null,authorizedTarget=false,explicitApproval=false}={}){
    const plan=this.planner.plan({playbook,target,authorizedTarget});const results=[];
    if(!this.commandRunner)return {executed:false,reason:'NO_COMMAND_RUNNER',plan};
    for(const step of plan.steps){
      const gate=this.gate.evaluate({argv:step.argv,explicitApproval,authorizedTarget});
      if(gate.decision!=='ALLOW'){results.push({id:step.id,skipped:true,gate});continue;}
      try{
        const result=await this.commandRunner({argv:step.argv,cwd:this.root,sideEffect:'R',timeoutMs:30000,maxOutputBytes:524288});
        results.push({id:step.id,skipped:false,gate,result});
      }catch(e){results.push({id:step.id,skipped:false,gate,error:String(e?.message??e)});}
    }
    return {executed:results.some(x=>!x.skipped),plan,results,allPassed:results.filter(x=>!x.skipped).every(x=>x.result?.exitCode===0)};
  }
  async #inventory({includeHighRisk=false}={}){
    const rows=[];for(const name of INVENTORY){const path=await resolveBinary(name,this.env);const classification=this.classifier.classify([name,'--version']);const high=['CREDENTIAL_OR_EXPLOIT','NETWORK_ACTIVE'].includes(classification.risk);if(high&&!includeHighRisk)rows.push({name,available:Boolean(path),path:null,mode:'REFERENCE_ONLY',risk:classification.risk});else rows.push({name,available:Boolean(path),path:path??null,mode:high?'REFERENCE_ONLY':'DIAGNOSTIC_CANDIDATE',risk:classification.risk});}
    return {count:rows.length,available:rows.filter(x=>x.available).length,tools:rows};
  }
  async #save(){const state={version:19,catalog:this.catalog.snapshot(),savedAt:new Date().toISOString()};await writeJsonAtomic(this.statePath,state);return {saved:true,path:this.statePath,entries:state.catalog.entries.length};}
  async #load(){const state=await readJson(this.statePath,null);if(!state)return {loaded:false,reason:'STATE_NOT_FOUND'};for(const e of state.catalog?.entries??[])this.catalog.upsert(e);if(state.catalog?.sourceState)this.catalog.observeSource(state.catalog.sourceState);return {loaded:true,version:state.version??19,entries:this.catalog.list().length};}
}
