import { resolve, join, dirname } from 'node:path';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import {
  SkillCatalog, SkillEvalHarness, McpSecurityGateway, A2ARouter, StatefulAgentKernel,
  SandboxWarmPool, TraceStore, CodeGraph, AndroidFeedbackLoop, AutomationPieceRegistry
} from './ecosystem-architecture.mjs';

async function readJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;}}
async function writeJsonAtomic(path,value){await mkdir(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.${Date.now()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');await rename(tmp,path);}

export class EcosystemRuntime {
  constructor({root,commandRunner=null,env=process.env}={}){
    if(!root)throw new Error('root is required');this.root=resolve(root);this.commandRunner=commandRunner;this.env=env;
    this.catalog=new SkillCatalog();this.evals=new SkillEvalHarness();this.gateway=new McpSecurityGateway({reservedTools:['omega_ecosystem_architect']});
    this.a2a=new A2ARouter();this.agents=new StatefulAgentKernel();this.sandboxes=new SandboxWarmPool();this.traces=new TraceStore();this.code=new CodeGraph();this.android=new AndroidFeedbackLoop();this.automation=new AutomationPieceRegistry();
    this.statePath=join(this.root,'.omega','ecosystem-v14.json');
  }
  async action({action,payload={}}={}){
    switch(action){
      case 'skill-upsert': return this.catalog.upsert(payload);
      case 'skill-catalog': return this.catalog.progressiveCatalog();
      case 'skill-activate': return this.catalog.activate(payload.id);
      case 'skill-dedupe': return this.catalog.deduplicate(payload);
      case 'skill-eval': return this.evals.compare(payload);
      case 'mcp-register': return this.gateway.register(payload);
      case 'mcp-list': return this.gateway.list();
      case 'mcp-authorize': return this.gateway.authorize(payload);
      case 'mcp-secret-scan': return this.gateway.scanSecrets(payload.value);
      case 'a2a-register': return this.a2a.register(payload);
      case 'a2a-route': return this.a2a.route(payload);
      case 'agent-create': return this.agents.create(payload);
      case 'agent-patch': return this.agents.patch(payload.id,payload.patch??{});
      case 'agent-checkpoint': return this.agents.checkpoint(payload.id,payload.label);
      case 'agent-pause': return this.agents.pause(payload.id);
      case 'agent-resume': return this.agents.resume(payload.id);
      case 'agent-handoff': return this.agents.handoff(payload.id,payload);
      case 'agent-get': return this.agents.get(payload.id);
      case 'sandbox-template': return this.sandboxes.template(payload);
      case 'sandbox-prewarm': return this.sandboxes.prewarm(payload.templateId,payload.count);
      case 'sandbox-claim': return this.sandboxes.claim(payload.templateId,payload.owner);
      case 'sandbox-release': return this.sandboxes.release(payload.id);
      case 'sandbox-reap': return this.sandboxes.reap(payload.now);
      case 'trace-start': return this.traces.startTrace(payload);
      case 'trace-span': return this.traces.span(payload.traceId,payload);
      case 'trace-end': return this.traces.end(payload.traceId,payload.end);
      case 'trace-summary': return this.traces.summary(payload.traceId);
      case 'code-symbol': return this.code.addSymbol(payload);
      case 'code-link': return this.code.link(payload.from,payload.to,payload.type);
      case 'code-impact': return this.code.impact(payload.id,payload);
      case 'code-dead': return this.code.dead();
      case 'android-open': return this.android.open(payload);
      case 'android-snapshot': return this.android.snapshot(payload.id,payload.elements??[]);
      case 'android-act': return this.android.act(payload.id,payload);
      case 'android-evidence': return this.android.evidence(payload.id,payload.item??{});
      case 'android-get': return this.android.get(payload.id);
      case 'automation-register': return this.automation.register(payload);
      case 'automation-validate': return this.automation.validate(payload.id,payload.input);
      case 'automation-plan': return this.automation.plan(payload.id,payload);
      case 'android-live': return await this.#androidLive(payload);
      case 'skill-validate-external': return await this.#skillValidateExternal(payload);
      case 'state-save': return await this.#save();
      case 'state-load': return await this.#load();
      default: throw new Error(`Unsupported ecosystem action: ${action}`);
    }
  }

  async #androidLive({command='doctor',args=[]}={}){
    const allowed=new Set(['doctor','open','snapshot','press','fill','screenshot','close','help']);
    if(!allowed.has(command))throw new Error(`Unsupported agent-device command ${command}`);
    if(!this.commandRunner)return {available:false,reason:'NO_COMMAND_RUNNER',command,args};
    const sideEffect=new Set(['open','press','fill','close']).has(command)?'L':'R';
    try{const result=await this.commandRunner({argv:['agent-device',command,...args.map(String)],cwd:this.root,sideEffect,timeoutMs:180000,maxOutputBytes:2097152});return {available:result.exitCode===0,provider:'agent-device',command,result};}
    catch(e){return {available:false,provider:'agent-device',command,reason:e?.code==='ENOENT'?'TOOL_UNAVAILABLE':String(e.message??e)};}
  }
  async #skillValidateExternal({path='.'}={}){
    if(!this.commandRunner)return {available:false,reason:'NO_COMMAND_RUNNER'};
    try{const result=await this.commandRunner({argv:['skills-ref','validate',path],cwd:this.root,sideEffect:'R',timeoutMs:120000,maxOutputBytes:1048576});return {available:result.exitCode===0,provider:'skills-ref',result};}
    catch(e){return {available:false,provider:'skills-ref',reason:e?.code==='ENOENT'?'TOOL_UNAVAILABLE':String(e.message??e)};}
  }

  async #save(){
    const state={version:14,skills:[...this.catalog.skills.values()].map(({tokenSet,...x})=>x),mcp:this.gateway.list(),a2a:[...this.a2a.agents.values()],savedAt:new Date().toISOString()};
    await writeJsonAtomic(this.statePath,state);return {path:this.statePath,counts:{skills:state.skills.length,mcp:state.mcp.length,a2a:state.a2a.length}};
  }
  async #load(){
    const state=await readJson(this.statePath,{version:14,skills:[],mcp:[],a2a:[]});
    for(const s of state.skills??[])this.catalog.upsert(s);for(const s of state.mcp??[])this.gateway.register(s);for(const a of state.a2a??[])this.a2a.register(a);
    return {loaded:true,counts:{skills:state.skills?.length??0,mcp:state.mcp?.length??0,a2a:state.a2a?.length??0}};
  }
}
