import { dirname, join, resolve } from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import {
  ActionSupplyChainAuditor, LandingPolicyEngine, AgentReliabilityAuditor, AiArtifactDiffGate,
  McpBehaviorGradeGate, KnowledgeSubstrate, WorkItemSessionStore, CanonicalAgentSyncPlanner,
  ReactNativeSpecialistRouter, DemoContractValidator, DeclarativeAgentContractValidator, LogEvidenceVerifier
} from './assurance-architecture.mjs';

async function readJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;}}
async function writeJsonAtomic(path,value){await mkdir(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.${Date.now()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');await rename(tmp,path);}

export class AssuranceRuntime {
  constructor({root,commandRunner=null,env=process.env}={}){
    if(!root)throw new Error('root is required');
    this.root=resolve(root);this.commandRunner=commandRunner;this.env=env;
    this.actions=new ActionSupplyChainAuditor();this.landing=new LandingPolicyEngine();this.reliability=new AgentReliabilityAuditor();this.artifacts=new AiArtifactDiffGate();this.mcpGrade=new McpBehaviorGradeGate();this.knowledge=new KnowledgeSubstrate();this.sessions=new WorkItemSessionStore();this.sync=new CanonicalAgentSyncPlanner();this.rn=new ReactNativeSpecialistRouter();this.demo=new DemoContractValidator();this.agentContract=new DeclarativeAgentContractValidator();this.logs=new LogEvidenceVerifier();this.statePath=join(this.root,'.omega','assurance-v23.json');
  }
  async action({action,payload={}}={}){
    switch(action){
      case 'action-audit': return this.actions.audit(payload);
      case 'landing-evaluate': return this.landing.evaluate(payload);
      case 'landing-policy-compare': return this.landing.compare(payload);
      case 'reliability-audit': return this.reliability.audit(payload);
      case 'ai-artifact-diff': return this.artifacts.diff(payload);
      case 'mcp-grade-gate': return this.mcpGrade.evaluate(payload);
      case 'knowledge-docset-upsert': return this.knowledge.docsetUpsert(payload);
      case 'knowledge-identity-upsert': return this.knowledge.identityUpsert(payload);
      case 'knowledge-read': return this.knowledge.read(payload);
      case 'knowledge-write': return this.knowledge.write(payload);
      case 'knowledge-approve': return this.knowledge.approve(payload);
      case 'knowledge-requests': return this.knowledge.requestsList();
      case 'session-save': return this.sessions.save(payload);
      case 'session-resume': return this.sessions.resume(payload);
      case 'agent-sync-plan': return this.sync.plan(payload);
      case 'react-native-route': return this.rn.route(payload);
      case 'demo-validate': return this.demo.validate(payload);
      case 'declarative-agent-validate': return this.agentContract.validate(payload);
      case 'log-evidence': return this.logs.verify(payload);
      case 'toolchain-doctor': return await this.#doctor(payload);
      case 'external-plan': return this.#externalPlan(payload);
      case 'state-save': return await this.#save();
      case 'state-load': return await this.#load();
      default: throw new Error(`Unsupported OMEGA v23 assurance action: ${action}`);
    }
  }
  #externalPlan({tool,operation,target='.'}={}){
    const allowed={
      trustabl:{scan:['trustabl','scan',target,'--format','json']},
      'secureai-scan':{scan:['secureai-scan','scan',target,'--output','secureai.sarif']},
      pyvisualizer:{check:['py-code-visualizer','check',target,'--fail-on-cycles'],context:['py-code-visualizer','context',target,'--budget-tokens','4000']},
      ollama:{list:['ollama','list']},
      autodemo:{help:['autodemo','--help']}
    };
    const argv=allowed?.[tool]?.[operation];
    if(!argv)return {available:false,reason:'UNSUPPORTED_EXTERNAL_ADAPTER',tool,operation};
    return {available:true,argv,sideEffect:'R',executeAutomatically:false,note:'External adapters are optional and must be installed/pinned separately. Planning does not claim execution.'};
  }
  async #doctor({commands=['trustabl','secureai-scan','py-code-visualizer','ollama','autodemo','sig','airlock']}={}){
    if(!this.commandRunner)return {available:false,reason:'COMMAND_RUNNER_UNAVAILABLE',tools:[]};
    const results=[];
    for(const command of commands){
      const argv=process.platform==='win32'?['where',command]:['sh','-lc',`command -v ${JSON.stringify(String(command))}`];
      try{const r=await this.commandRunner({argv,cwd:this.root,sideEffect:'R',timeoutMs:10000,maxOutputBytes:65536});results.push({command,available:r.exitCode===0,path:(r.stdout??'').trim().split(/\r?\n/)[0]||null,exitCode:r.exitCode});}
      catch(error){results.push({command,available:false,error:error?.message??String(error)});}
    }
    return {available:true,tools:results};
  }
  async #save(){const state={version:23,knowledge:this.knowledge.snapshot(),sessions:this.sessions.snapshot(),savedAt:new Date().toISOString()};await writeJsonAtomic(this.statePath,state);return {saved:true,path:this.statePath,version:23};}
  async #load(){const state=await readJson(this.statePath,{version:23});this.knowledge.restore(state.knowledge??{});this.sessions.restore(state.sessions??[]);return {loaded:true,version:state.version??23};}
}
