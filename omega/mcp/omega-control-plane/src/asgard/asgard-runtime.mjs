import { resolve, join, dirname, relative } from 'node:path';
import { mkdir, readFile, writeFile, rename, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  AgentDirectory, ThorOrchestrator, LokiMarketIntel, KratosSecurity, RagnarAutomationScout,
  FlokiCatalog, AtreusDeviceSupervisor, ArtifactFactory, HaraldAccountIntel, IvarResearchBroker,
  KronikarzNewsroom, WieszczMarketplace
} from './asgard-architecture.mjs';
import { GeminiInteractionsClient, extractGeminiText, GEMINI_DEFAULTS } from './gemini-interactions.mjs';
import { AccountTunnelBroker } from './account-tunnel-broker.mjs';

async function readJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;}}
async function writeJsonAtomic(path,value){await mkdir(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.${Date.now()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');await rename(tmp,path);}
function safeSlug(v){const s=String(v??'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!s)throw new Error('invalid slug');return s;}
function sha256Buffer(buf){return createHash('sha256').update(buf).digest('hex');}

export class AsgardRuntime {
  constructor({root,commandRunner=null,mcpInvoker=null,artifactScript=null,python=null,env=process.env,fetchImpl=globalThis.fetch,realityGate=null}={}){
    if(!root)throw new Error('root is required');this.root=resolve(root);this.commandRunner=commandRunner;this.mcpInvoker=mcpInvoker;this.artifactScript=artifactScript;this.python=python??env.OMEGA_PYTHON??'python3';this.env=env;this.realityGate=realityGate;
    this.directory=new AgentDirectory();this.thor=new ThorOrchestrator({directory:this.directory});this.loki=new LokiMarketIntel();this.kratos=new KratosSecurity();this.ragnar=new RagnarAutomationScout();this.floki=new FlokiCatalog();this.atreus=new AtreusDeviceSupervisor();this.harald=new HaraldAccountIntel();this.ivar=new IvarResearchBroker();this.kronikarz=new KronikarzNewsroom();this.wieszcz=new WieszczMarketplace();this.factory=new ArtifactFactory();
    this.fetchImpl=fetchImpl;this.gemini=new GeminiInteractionsClient({env:this.env,fetchImpl});this.tunnels=new AccountTunnelBroker({env:this.env});
    this.ivar.registerProvider({id:'chatgpt-host',kind:'CHATGPT',transport:'HOST_ORCHESTRATION',authorized:true,metadata:{host:'ChatGPT'}});
    this.ivar.registerProvider({id:'gemini-interactions',kind:'GEMINI',transport:'GEMINI_INTERACTIONS_API',authorized:this.gemini.configuration().apiKeyPresent,metadata:{endpoint:GEMINI_DEFAULTS.endpoint,model:GEMINI_DEFAULTS.model,deepResearchAgent:GEMINI_DEFAULTS.deepResearchAgent,apiKeyEnv:this.gemini.apiKeyEnv}});
    this.statePath=join(this.root,'.omega','asgard-v20.json');this.legacyStatePath=join(this.root,'.omega','asgard-v18.json');this.activeAgent='thor';
  }

  async action({action,payload={}}={}){
    switch(action){
      case 'list-agents': return {primary:this.directory.list({includeDomain:false}),categories:this.directory.categories(),activeAgent:this.activeAgent};
      case 'agent-card': return this.directory.card(payload.id??payload.name);
      case 'invoke-agent': {const card=this.directory.card(payload.id??payload.name);this.activeAgent=card.id;return {activeAgent:card.id,card,directConversation:true,separateModelClaimed:false};}
      case 'command': return this.#command(payload.text??'');
      case 'thor-submit': return this.thor.submit(payload);
      case 'thor-assign': return this.thor.assign(payload.id);
      case 'thor-update': return this.thor.update(payload.id,payload);
      case 'thor-finalize': return await this.#thorFinalize(payload);
      case 'thor-get': return this.thor.get(payload.id);
      case 'thor-list': return this.thor.list();
      case 'thor-automation-mode': return this.thor.setAutomationMode(payload.mode);
      case 'thor-automation-get': return this.thor.automation();
      case 'thor-github-doctor': return await this.#githubDoctor(payload);
      case 'thor-github-create-repo': return await this.#githubCreateRepo(payload);
      case 'account-register': return this.tunnels.register(payload);
      case 'account-bootstrap': return this.tunnels.bootstrap(payload);
      case 'account-list': return this.tunnels.list(payload);
      case 'account-route': return this.tunnels.route(payload);
      case 'account-acquire': return this.tunnels.acquire(payload);
      case 'account-release': return this.tunnels.release(payload.sessionId,payload);
      case 'account-health': return this.tunnels.setHealth(payload.id,payload);
      case 'account-auth-descriptor': return this.tunnels.authDescriptor(payload.id);
      case 'factory-create': return await this.#factoryCreate(payload);
      case 'loki-ingest': return this.loki.ingest(payload);
      case 'loki-ranked': return this.loki.ranked(payload);
      case 'loki-handoff': return this.loki.handoff(payload.id,payload);
      case 'loki-to-thor': return this.#lokiToThor(payload);
      case 'kratos-secret-register': return this.kratos.registerSecretRef(payload);
      case 'kratos-secret-list': return this.kratos.listSecretRefs();
      case 'kratos-secret-check': return this.kratos.rejectRawSecretObject(payload.value??payload);
      case 'kratos-signing-register': return this.kratos.registerSigningProfile(payload);
      case 'kratos-signing-doctor': return await this.#signingDoctor();
      case 'kratos-sign-apk': return await this.#signApk(payload);
      case 'kratos-monetization-plan': return this.kratos.monetizationPlan(payload);
      case 'ragnar-snapshot': return this.ragnar.snapshot(payload);
      case 'ragnar-coverage-set': return this.ragnar.coverageSet(payload);
      case 'ragnar-gaps': return this.ragnar.gaps(payload.items??[]);
      case 'ragnar-live-packages': return await this.#livePackages();
      case 'ragnar-discovery-ingest': return this.ragnar.ingestDiscovery(payload);
      case 'ragnar-discoveries': return this.ragnar.rankedDiscoveries(payload);
      case 'ragnar-to-thor': return this.#ragnarToThor(payload);
      case 'floki-record': return this.floki.record(payload);
      case 'floki-catalog': return this.floki.catalog(payload);
      case 'floki-summary': return this.floki.summary();
      case 'atreus-interpret-health': return this.atreus.interpretHealth(payload);
      case 'atreus-doctor': return await this.#atreusDoctor();
      case 'atreus-developer-options': return await this.#developerOptions();
      case 'atreus-set-developer-option': return await this.#setDeveloperOption(payload);
      case 'harald-connector-register': return this.harald.registerConnector(payload);
      case 'harald-connectors': return this.harald.connectorsList();
      case 'harald-ingest': return this.harald.ingest(payload);
      case 'harald-pull': return await this.#haraldPull(payload);
      case 'harald-projects': return this.harald.projects();
      case 'harald-to-thor': return this.#haraldToThor(payload);
      case 'ivar-provider-register': return this.ivar.registerProvider(payload);
      case 'ivar-providers': return this.ivar.providersList();
      case 'ivar-project-create': return this.ivar.createProject(payload);
      case 'ivar-project-get': return this.ivar.get(payload.id);
      case 'ivar-dispatch-plan': return this.ivar.dispatchPlan(payload.id);
      case 'ivar-dispatch': return await this.#ivarDispatch(payload);
      case 'ivar-to-thor': return this.#ivarToThor(payload);
      case 'ivar-gemini-doctor': return await this.#ivarGeminiDoctor(payload);
      case 'ivar-gemini-start': return await this.#ivarGeminiStart(payload);
      case 'ivar-gemini-get': return await this.#ivarGeminiGet(payload);
      case 'ivar-gemini-await': return await this.#ivarGeminiAwait(payload);
      case 'ivar-gemini-continue': return await this.#ivarGeminiContinue(payload);
      case 'ivar-host-result': return this.#ivarHostResult(payload);
      case 'ivar-synthesis': return this.ivar.synthesisPacket(payload.id);
      case 'ivar-cross-model-start': return await this.#ivarCrossModelStart(payload);
      case 'kronikarz-edition': return this.#kronikarzEdition(payload);
      case 'kronikarz-pdf': return await this.#kronikarzPdf(payload);
      case 'wieszcz-benchmark-set': return this.wieszcz.setMarketBenchmark(payload);
      case 'wieszcz-offer-upsert': return this.wieszcz.upsertOffer(payload);
      case 'wieszcz-offers': return this.wieszcz.offersList(payload);
      case 'wieszcz-order-create': return this.wieszcz.createOrder(payload);
      case 'wieszcz-order-get': return this.wieszcz.order(payload.id);
      case 'wieszcz-payment-intent': return this.wieszcz.paymentIntent(payload);
      case 'wieszcz-publisher-register': return this.wieszcz.registerPublisher(payload);
      case 'wieszcz-publishers': return this.wieszcz.publishersList();
      case 'wieszcz-consent-register': return this.wieszcz.registerConsent(payload);
      case 'wieszcz-consents': return this.wieszcz.consentsList();
      case 'wieszcz-order-update': return this.wieszcz.updateOrder(payload.id,payload.patch??{});
      case 'wieszcz-fulfillment-plan': return this.wieszcz.fulfillmentPlan(payload.id);
      case 'wieszcz-publish-catalog': return await this.#wieszczPublishCatalog(payload);
      case 'wieszcz-tender-ingest': return this.wieszcz.ingestTender(payload);
      case 'wieszcz-tenders': return this.wieszcz.rankedTenders();
      case 'wieszcz-export-catalog': return await this.#wieszczExportCatalog(payload);
      case 'state-save': return await this.#save();
      case 'state-load': return await this.#load();
      default: throw new Error(`Unsupported ASGARD action: ${action}`);
    }
  }

  async #thorFinalize(payload={}){
    const task=this.thor.get(payload.id);
    const incomplete=task.subtasks.filter(s=>s.required&&s.status!=='DONE');
    if(incomplete.length)return {done:false,reason:'REQUIRED_SUBTASKS_INCOMPLETE',blockers:incomplete.map(b=>({id:b.id,agent:b.agent,capability:b.capability,status:b.status}))};
    if(this.realityGate){
      const evidence=task.subtasks.filter(s=>s.required&&s.status==='DONE').map(s=>({id:`thor:${task.id}:${s.id}`,state:'OBSERVED',kind:'asgard-subtask-state',source:'ASGARD_RUNTIME',authorityClass:'PROJECT_SCHEMA',reliability:1,deterministic:true,supports:true,payload:{status:s.status,agent:s.agent,capability:s.capability},observedAt:new Date().toISOString()}));
      const claims=evidence.map((e,i)=>({id:`thor-claim-${i+1}`,text:`Required subtask ${e.payload.capability} completed`,verified:true,evidenceIds:[e.id],source:'ASGARD_RUNTIME',required:true}));
      const qa=task.subtasks.find(s=>s.capability==='quality-gate');
      const buildSteps=task.subtasks.filter(s=>/build/i.test(s.capability));
      const artifactRequired=(task.deliverables??[]).some(d=>/(apk|aab|pdf|zip|artifact|file|plik|repo|plugin|mcp|skill|tool|app|gra|game)/i.test(String(d)));
      const artifactPresent=task.subtasks.some(s=>(s.artifacts??[]).length>0)||!artifactRequired;
      const buildRequired=buildSteps.length>0;
      const buildObserved=!buildRequired||buildSteps.every(s=>s.status==='DONE'&&((s.evidence??[]).length>0||(s.artifacts??[]).length>0));
      const testRequired=Boolean(qa);
      const testsObserved=!testRequired||(qa.status==='DONE'&&(qa.evidence??[]).length>0);
      const securityRequired=task.capabilities.some(c=>/(security|secret|signing)/i.test(c));
      const gate=await this.realityGate({claims,evidence,artifactRequired,artifactPresent,testRequired,testsObserved,buildRequired,buildObserved,securityRequired,securityPayload:payload.product??{},responseText:payload.summary??'',mode:'STRICT',decisionTrace:{decision:`Finalize Thor task ${task.id}`,claims:claims.map(c=>({id:c.id,evidenceIds:c.evidenceIds}))}});
      if(!gate?.allowedDone)return {done:false,reason:'REALITY_FILTER_BLOCKED',realityGate:gate};
      const final=this.thor.finalize(payload.id,payload);return {...final,realityGate:gate};
    }
    return this.thor.finalize(payload.id,payload);
  }

  #command(text){
    const normalized=String(text).trim().toLocaleUpperCase('pl-PL');
    if(normalized==='LISTA AGENTÓW'||normalized==='LISTA AGENTOW')return {command:'LISTA AGENTÓW',primary:this.directory.list({includeDomain:false}),categories:this.directory.categories(),usage:'Wywołaj agenta po nazwie: THOR, LOKI, KRATOS, RAGNAR, FLOKI, ATREUS, HARALD, IVAR, KRONIKARZ lub WIESZCZ.'};
    const direct=['THOR','LOKI','KRATOS','RAGNAR','FLOKI','ATREUS','HARALD','IVAR','KRONIKARZ','WIESZCZ'].find(x=>x===normalized);
    if(direct){const card=this.directory.card(direct);this.activeAgent=card.id;return {command:'INVOKE_AGENT',activeAgent:card.id,card,directConversation:true};}
    return {command:'UNRECOGNIZED',text};
  }

  #lokiToThor({id,goalPrefix='Zrealizuj okazję rynkową'}={}){
    const rec=this.loki.handoff(id);const task=this.thor.submit({goal:`${goalPrefix}: ${rec.title}. ${rec.problem}`,priority:'HIGH'});return {opportunity:rec,thorTask:task};
  }


  #ragnarToThor({id,goalPrefix='Zrealizuj okazję wykrytą przez Ragnar'}={}){const rec=this.ragnar.discoveries.get(id);if(!rec)throw new Error('unknown Ragnar discovery');rec.status='HANDED_TO_THOR';const task=this.thor.submit({goal:`${goalPrefix}: ${rec.title}. ${rec.url??''}`,priority:'HIGH'});return {discovery:structuredClone(rec),thorTask:task};}

  #haraldToThor({id,goalPrefix='Zrealizuj projekt opracowany przez Harald'}={}){const p=this.harald.handoff(id);const task=this.thor.submit({goal:`${goalPrefix}: ${p.title}. ${p.brief}`,priority:'HIGH'});return {project:p,thorTask:task};}

  #ivarToThor({id,goalPrefix='Zintegruj wyniki badań Ivar i zrealizuj projekt'}={}){const p=this.ivar.get(id);const task=this.thor.submit({goal:`${goalPrefix}: ${p.title}. ${p.brief}`,priority:'HIGH',deliverables:Object.keys(p.results??{}).map(x=>`research:${x}`)});return {research:p,thorTask:task};}


  async #githubDoctor({accountId=null}={}){const env=accountId?this.tunnels.envPatch(accountId):{};const auth=await this.#run(['gh','auth','status'],{env});const user=await this.#run(['gh','api','user','--jq','.login'],{env});return {ready:Boolean(auth.available&&auth.result?.exitCode===0&&user.available&&user.result?.exitCode===0),accountId,auth,user};}

  async #githubCreateRepo({name,owner=null,description='',visibility='private',approved=false,initialize=false,accountId=null}={}){
    if(!name)return {created:false,reason:'NAME_REQUIRED'};if(!this.thor.canExternalCreate({approved}))return {created:false,reason:'APPROVAL_OR_FULL_AUTOMATION_REQUIRED'};
    const endpoint=owner?`orgs/${owner}/repos`:'user/repos';const argv=['gh','api','--method','POST',endpoint,'-f',`name=${name}`,'-F',`private=${String(String(visibility).toLowerCase()!=='public')}`];
    if(description)argv.push('-f',`description=${description}`);if(initialize)argv.push('-F','auto_init=true');
    const env=accountId?this.tunnels.envPatch(accountId):{};const run=await this.#run(argv,{sideEffect:'E',timeoutMs:120000,env});if(!run.available||run.result?.exitCode!==0)return {created:false,provider:'gh',run};let repository=null;try{repository=JSON.parse(String(run.result.stdout??'{}'));}catch{repository={raw:String(run.result.stdout??'')}}return {created:true,provider:'gh',accountId,repository,automationMode:this.thor.automation().mode};
  }

  async #haraldPull({connectorId,arguments:args={}}={}){
    const c=this.harald.connector(connectorId);if(!c.authorized)return {available:false,reason:'CONNECTOR_NOT_AUTHORIZED',connector:c};
    if(c.transport==='HOST_CONNECTOR')return {available:false,reason:'HOST_CONNECTOR_REQUIRES_HOST_ORCHESTRATION',connector:c,tunnelClaimed:false};
    if(!this.mcpInvoker||!c.providerId||!c.toolName)return {available:false,reason:'MCP_PROVIDER_UNAVAILABLE',connector:c,tunnelClaimed:false};
    try{const result=await this.mcpInvoker({providerId:c.providerId,name:c.toolName,arguments:args});const items=Array.isArray(result?.items)?result.items:Array.isArray(result?.results)?result.results:[];const ingestion=this.harald.ingest({connectorId,items});return {available:true,connector:c,result,ingestion,tunnelClaimed:false};}catch(e){return {available:false,reason:String(e.message??e),connector:c,tunnelClaimed:false};}
  }

  async #ivarDispatch({id,arguments:args={}}={}){
    const plan=this.ivar.dispatchPlan(id);const project=this.ivar.get(id);const jobs=[];
    for(const job of plan.jobs){
      if(!job.available){jobs.push({...job,status:'UNAVAILABLE'});continue;}
      const provider=this.ivar.providers.get(job.providerId);
      if(provider.transport==='HOST_ORCHESTRATION'){jobs.push({...job,status:'HOST_ORCHESTRATION_REQUIRED'});continue;}
      if(provider.transport==='GEMINI_INTERACTIONS_API'){
        const mode=String(args.geminiMode??project.metadata?.geminiMode??'deep-research').toLowerCase();
        let tunnel=null;
        try{
          tunnel=this.#geminiClientForAccount(args.geminiAccountId??project.metadata?.geminiAccountId??null,id);
          const prompt=`${project.title}

${project.brief}`;
          const result=mode==='model'
            ? await tunnel.client.createModel({input:prompt,model:args.geminiModel??project.metadata?.geminiModel??GEMINI_DEFAULTS.model,background:Boolean(args.background??false),tools:args.geminiTools??null,systemInstruction:args.systemInstruction??null,generationConfig:args.generationConfig??null})
            : await tunnel.client.createDeepResearch({input:prompt,agent:args.geminiAgent??project.metadata?.geminiAgent??GEMINI_DEFAULTS.deepResearchAgent,tools:args.geminiTools??null,background:true,thinkingSummaries:args.thinkingSummaries??'auto',visualization:args.visualization??'auto',collaborativePlanning:Boolean(args.collaborativePlanning??false)});
          this.ivar.recordJob(id,{providerId:provider.id,interactionId:result.id??null,status:String(result.status??'IN_PROGRESS').toUpperCase(),metadata:{mode,accountId:tunnel.accountId}});
          if(result.status==='completed')this.ivar.recordResult(id,{providerId:provider.id,result:{interaction:result,text:extractGeminiText(result),accountId:tunnel.accountId},evidence:[{type:'provider',provider:'Gemini Interactions API',interactionId:result.id??null,accountId:tunnel.accountId}]});
          jobs.push({...job,status:result.status??'submitted',interactionId:result.id??null,mode,accountId:tunnel.accountId});
          this.#releaseTunnel(tunnel.lease,true);
        }catch(e){this.#releaseTunnel(tunnel?.lease,false);jobs.push({...job,status:'FAILED',error:String(e.message??e),code:e.code??null});}
        continue;
      }
      if(provider.transport==='MCP_FEDERATION'){
        if(!this.mcpInvoker||!provider.providerId||!provider.toolName){jobs.push({...job,status:'PROVIDER_UNAVAILABLE'});continue;}
        try{const result=await this.mcpInvoker({providerId:provider.providerId,name:provider.toolName,arguments:{title:project.title,brief:project.brief,...args}});this.ivar.recordResult(id,{providerId:provider.id,result});jobs.push({...job,status:'DONE',result});}catch(e){jobs.push({...job,status:'FAILED',error:String(e.message??e)});}continue;
      }
      jobs.push({...job,status:'UNSUPPORTED_TRANSPORT'});
    }
    return {projectId:id,jobs,vpnClaimed:false,project:this.ivar.get(id)};
  }

  #geminiClientForAccount(accountId=null,affinityKey=null){
    let acquired=null;
    if(accountId)acquired=this.tunnels.acquire({provider:'GEMINI',accountId,capability:'research',affinityKey});
    else if(this.tunnels.list({provider:'GEMINI'}).length)acquired=this.tunnels.acquire({provider:'GEMINI',capability:'research',affinityKey});
    if(!acquired)return {client:this.gemini,lease:null,accountId:null};
    if(!acquired.acquired){const e=new Error(`Gemini account unavailable${accountId?`: ${accountId}`:''}`);e.code='GEMINI_ACCOUNT_UNAVAILABLE';throw e;}
    const selectedId=acquired.account.id;const key=this.tunnels.secretValue(selectedId);
    const client=new GeminiInteractionsClient({apiKey:key,apiKeyEnv:acquired.account.secretEnvRef??'UNSET',env:this.env,fetchImpl:this.fetchImpl});
    return {client,lease:acquired.session,accountId:selectedId};
  }

  #releaseTunnel(lease,ok=true){if(lease?.sessionId)this.tunnels.release(lease.sessionId,{ok});}

  async #ivarGeminiDoctor({accountId=null,probe=false}={}){const tunnel=this.#geminiClientForAccount(accountId,null);try{const out=await tunnel.client.doctor({probe});this.#releaseTunnel(tunnel.lease,Boolean(out.ready));return {...out,accountId:tunnel.accountId};}catch(e){this.#releaseTunnel(tunnel.lease,false);throw e;}}

  async #ivarGeminiStart({projectId=null,input=null,mode='deep-research',model=GEMINI_DEFAULTS.model,agent=GEMINI_DEFAULTS.deepResearchAgent,tools=null,background=null,systemInstruction=null,generationConfig=null,accountId=null}={}){
    let prompt=input;let project=null;if(projectId){project=this.ivar.get(projectId);prompt=prompt??`${project.title}\n\n${project.brief}`;}if(!prompt)throw new Error('input or projectId required');
    const provider=[...this.ivar.providers.values()].find(x=>x.kind==='GEMINI'&&x.transport==='GEMINI_INTERACTIONS_API')??this.ivar.registerProvider({id:'gemini-interactions',kind:'GEMINI',transport:'GEMINI_INTERACTIONS_API',authorized:this.gemini.configuration().apiKeyPresent});
    const tunnel=this.#geminiClientForAccount(accountId,projectId);let result;try{result=String(mode).toLowerCase()==='model'
      ? await tunnel.client.createModel({input:prompt,model,background:Boolean(background),tools,systemInstruction,generationConfig})
      : await tunnel.client.createDeepResearch({input:prompt,agent,tools,background:background??true});}catch(e){this.#releaseTunnel(tunnel.lease,false);throw e;}this.#releaseTunnel(tunnel.lease,true);
    if(projectId){this.ivar.recordJob(projectId,{providerId:provider.id,interactionId:result.id??null,status:String(result.status??'IN_PROGRESS').toUpperCase(),metadata:{mode}});if(result.status==='completed')this.ivar.recordResult(projectId,{providerId:provider.id,result:{interaction:result,text:extractGeminiText(result)},evidence:[{type:'provider',provider:'Gemini Interactions API',interactionId:result.id??null}]});}
    return {provider:'Gemini Interactions API',mode,accountId,interaction:result,text:extractGeminiText(result),vpnClaimed:false,libraryAccessClaimed:false};
  }

  async #ivarGeminiGet({interactionId,projectId=null,accountId=null}={}){if(!interactionId)throw new Error('interactionId required');const tunnel=this.#geminiClientForAccount(accountId,projectId);let interaction;try{interaction=await tunnel.client.get(interactionId);this.#releaseTunnel(tunnel.lease,true);}catch(e){this.#releaseTunnel(tunnel.lease,false);throw e;}const text=extractGeminiText(interaction);if(projectId&&interaction.status==='completed')this.ivar.recordResult(projectId,{providerId:'gemini-interactions',result:{interaction,text,accountId:tunnel.accountId},evidence:[{type:'provider',provider:'Gemini Interactions API',interactionId,accountId:tunnel.accountId}]});return {interaction,text,accountId:tunnel.accountId};}

  async #ivarGeminiAwait({interactionId,projectId=null,accountId=null,pollIntervalMs=5000,maxPolls=240,maxWaitMs=1200000}={}){if(!interactionId)throw new Error('interactionId required');const tunnel=this.#geminiClientForAccount(accountId,projectId);let out;try{out=await tunnel.client.awaitCompletion(interactionId,{pollIntervalMs,maxPolls,maxWaitMs});this.#releaseTunnel(tunnel.lease,true);}catch(e){this.#releaseTunnel(tunnel.lease,false);throw e;}if(projectId&&out.completed)this.ivar.recordResult(projectId,{providerId:'gemini-interactions',result:{interaction:out.interaction,text:out.text,accountId:tunnel.accountId},evidence:[{type:'provider',provider:'Gemini Interactions API',interactionId,accountId:tunnel.accountId}]});return {...out,accountId:tunnel.accountId};}

  async #ivarGeminiContinue({previousInteractionId,input,model=GEMINI_DEFAULTS.model,background=false,tools=null,systemInstruction=null,generationConfig=null,accountId=null,affinityKey=null}={}){const tunnel=this.#geminiClientForAccount(accountId,affinityKey);let interaction;try{interaction=await tunnel.client.continue({previousInteractionId,input,model,background,tools,systemInstruction,generationConfig});this.#releaseTunnel(tunnel.lease,true);}catch(e){this.#releaseTunnel(tunnel.lease,false);throw e;}return {interaction,text:extractGeminiText(interaction),accountId:tunnel.accountId};}

  #ivarHostResult({projectId,result,evidence=[],accountId=null}={}){if(!projectId)throw new Error('projectId required');return this.ivar.recordResult(projectId,{providerId:'chatgpt-host',result:{value:result,accountId},evidence:[...evidence,...(accountId?[{type:'host-profile',provider:'ChatGPT',accountId}]:[])]});}

  async #ivarCrossModelStart({title,brief,metadata={},geminiMode='deep-research',geminiTools=null,geminiAccountId=null,chatgptAccountId=null}={}){const project=this.ivar.createProject({title,brief,requiredProviders:['CHATGPT','GEMINI'],metadata:{...metadata,geminiMode,geminiAccountId,chatgptAccountId}});const dispatch=await this.#ivarDispatch({id:project.id,arguments:{geminiMode,geminiTools,geminiAccountId}});return {project:dispatch.project,jobs:dispatch.jobs,chatgptAccountId,chatgptInstruction:`Run the ChatGPT-side analysis in the host${chatgptAccountId?` using host profile ${chatgptAccountId}`:''}, then record it with ivar-host-result. Host profile switching requires a real host/session surface.`,vpnClaimed:false};}


  #kronikarzEdition(payload={}){
    const completed=this.thor.list().filter(x=>x.status==='DONE').map(x=>({title:x.goal,summary:x.final?.summary??''}));
    const planned=this.thor.list().filter(x=>x.status!=='DONE'&&x.status!=='FAILED').map(x=>({title:x.goal,summary:x.status}));
    const changes=this.floki.changes.map(x=>({title:`${x.category}: ${x.item}`,summary:x.notes??x.status}));
    const market=[...this.loki.ranked().slice(0,10).map(x=>({title:x.title,summary:x.problem})),...this.ragnar.rankedDiscoveries().slice(0,10).map(x=>({title:x.title,summary:`${x.kind} score ${x.score.toFixed(2)}`}))];
    const accounts=[...this.harald.signals.values()].slice(-20);return this.kronikarz.buildEdition({...payload,completed:[...completed,...changes],planned,market,accounts});
  }

  async #kronikarzPdf({output=null,...payload}={}){
    const edition=this.#kronikarzEdition(payload);const out=this.#assertInside(output??join('reports',`mojealterego-news-${edition.to}.pdf`));const articlePath=this.#assertInside(join('.omega','reports',`mojealterego-news-${edition.to}.json`));await mkdir(dirname(articlePath),{recursive:true});await writeJsonAtomic(articlePath,edition);
    if(!this.artifactScript)return {generated:false,reason:'PDF_RENDERER_UNAVAILABLE',articlePath,edition};
    const blocks=[];for(const section of edition.sections){blocks.push({type:'heading',text:section.title});for(const item of section.items)blocks.push({type:'paragraph',text:`${item.title}${item.summary?` — ${item.summary}`:''}`});}
    const reqPath=this.#assertInside(join('.omega','reports',`request-${edition.to}.json`));await writeJsonAtomic(reqPath,{operation:'news-pdf',output:out,brand:edition.brand,issue:`Wydanie ${edition.issue}`,period:`${edition.from}–${edition.to}`,title:edition.title,dek:edition.dek,sections:edition.sections,footer:`Mojealterego News • ${edition.from}–${edition.to}`});
    const run=await this.#run([this.python,this.artifactScript,'--request',reqPath],{sideEffect:'L',timeoutMs:180000});return {generated:Boolean(run.available&&run.result?.exitCode===0),output:out,articlePath,edition,run};
  }

  async #wieszczExportCatalog({output='market/catalog.json'}={}){const path=this.#assertInside(output);await mkdir(dirname(path),{recursive:true});const body={generatedAt:new Date().toISOString(),offers:this.wieszcz.offersList(),tenders:this.wieszcz.rankedTenders(),paymentExecution:'EXTERNAL_PROVIDER_REQUIRED'};await writeJsonAtomic(path,body);return {exported:true,path,count:body.offers.length};}

  async #wieszczPublishCatalog({publisherId,arguments:args={}}={}){const p=this.wieszcz.publishers.get(publisherId);if(!p)return {published:false,reason:'PUBLISHER_NOT_FOUND'};if(!p.authorized)return {published:false,reason:'PUBLISHER_NOT_AUTHORIZED',publisher:p};const catalog={offers:this.wieszcz.offersList(),tenders:this.wieszcz.rankedTenders(),generatedAt:new Date().toISOString()};if(p.transport==='HOST_CONNECTOR')return {published:false,reason:'HOST_CONNECTOR_REQUIRES_HOST_ORCHESTRATION',publisher:p,catalog};if(!this.mcpInvoker||!p.providerId||!p.toolName)return {published:false,reason:'MCP_PROVIDER_UNAVAILABLE',publisher:p,catalog};try{const result=await this.mcpInvoker({providerId:p.providerId,name:p.toolName,arguments:{catalog,...args}});return {published:true,publisher:p,result};}catch(e){return {published:false,reason:String(e.message??e),publisher:p};}}

  #assertInside(path){const full=resolve(this.root,path);const rel=relative(this.root,full);if(rel.startsWith('..')||rel==='..')throw new Error('path outside ASGARD workspace');return full;}

  async #factoryCreate(payload){
    const spec=this.factory.createSpec(payload);const base=this.#assertInside(payload.destination??join('generated',spec.slug));await mkdir(base,{recursive:true});
    const files={};
    if(spec.type==='skill'){
      files['SKILL.md']=`---\nname: ${spec.slug}\ndescription: ${spec.description||`Skill ${spec.name}`}\n---\n\n# ${spec.name}\n\n## Capabilities\n${spec.capabilities.map(x=>`- ${x}`).join('\n')||'- task-specific capability'}\n\n## Procedure\n1. Observe the task and required evidence.\n2. Execute only available tools.\n3. Verify outputs before completion.\n`;
    } else if(spec.type==='mcp'){
      files['package.json']=JSON.stringify({name:spec.slug,version:'0.1.0',private:true,type:'module',scripts:{start:'node src/server.mjs'},dependencies:{'@modelcontextprotocol/server':'^2.3.0',zod:'^4.0.0'}},null,2)+'\n';
      files['src/server.mjs']=`import { McpServer } from '@modelcontextprotocol/server';\nimport { StdioServerTransport } from '@modelcontextprotocol/server/stdio.js';\nimport { z } from 'zod';\nconst server=new McpServer({name:${JSON.stringify(spec.slug)},version:'0.1.0'});\nserver.registerTool('health',{description:'Health check',inputSchema:z.object({})},async()=>({content:[{type:'text',text:'ok'}]}));\nconst transport=new StdioServerTransport();\nawait server.connect(transport);\n`;
    } else if(spec.type==='plugin'){
      files['plugin.json']=JSON.stringify({$schema:'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',name:spec.slug,version:'0.1.0',description:spec.description||spec.name,author:{name:'Moje Alterego'},extensions:{'com.openai':{interface:{displayName:spec.name,shortDescription:spec.description||spec.name,developerName:'Moje Alterego',category:'Developer Tools',capabilities:['Interactive']}}}},null,2)+'\n';
      files['README.md']=`# ${spec.name}\n\n${spec.description}\n`;
      files['skills/.keep']='';
    } else if(spec.type==='tool'){
      files['tool.schema.json']=JSON.stringify({name:spec.slug,description:spec.description,inputSchema:{type:'object',properties:{}},outputSchema:{type:'object'}},null,2)+'\n';
      files['handler.mjs']=`export async function run(input){ return {ok:true,input}; }\n`;
    } else if(spec.type==='code-agent'){
      files['agent.json']=JSON.stringify({id:spec.slug,name:spec.name,type:'code-agent',description:spec.description,capabilities:spec.capabilities,tools:spec.tools,guardrails:['evidence-required','no-fabricated-execution']},null,2)+'\n';
      files['AGENT.md']=`# ${spec.name}\n\nCode agent generated by Thor/ASGARD.\n`;
    } else if(spec.type==='no-code-agent'){
      files['workflow.json']=JSON.stringify({name:spec.name,kind:'portable-no-code-agent',version:1,triggers:[],steps:[],capabilities:spec.capabilities,providerDeployment:false},null,2)+'\n';
      files['README.md']=`# ${spec.name}\n\nPortable no-code workflow definition. Deployment requires a real workflow provider.\n`;
    } else if(spec.type==='agent-system'){
      files['system.json']=JSON.stringify({name:spec.name,version:1,orchestrator:'thor',capabilities:spec.capabilities,agents:[],tools:spec.tools},null,2)+'\n';
      files['README.md']=`# ${spec.name}\n\nMulti-agent system scaffold generated by ASGARD.\n`;
    }
    const written=[];
    for(const [rel,content] of Object.entries(files)){const path=this.#assertInside(join(base,rel));await mkdir(dirname(path),{recursive:true});await writeFile(path,content,'utf8');written.push({path,sha256:sha256Buffer(Buffer.from(content)),bytes:Buffer.byteLength(content)});}
    const manifest={...spec,root:base,files:written,complete:true};await writeJsonAtomic(join(base,'ASGARD_MANIFEST.json'),manifest);return manifest;
  }

  async #run(argv,{sideEffect='R',timeoutMs=120000,cwd=this.root,env={}}={}){
    if(!this.commandRunner)return {available:false,reason:'NO_COMMAND_RUNNER',argv};
    try{return {available:true,result:await this.commandRunner({argv,cwd,env,sideEffect,timeoutMs,maxOutputBytes:2097152})};}
    catch(e){return {available:false,reason:e?.code==='ENOENT'?'TOOL_UNAVAILABLE':String(e.message??e),argv};}
  }

  async #signingDoctor(){
    const tools={};for(const [id,argv] of Object.entries({apksigner:['apksigner','--version'],keytool:['keytool','-help'],jarsigner:['jarsigner','-help']})){const r=await this.#run(argv);tools[id]={available:r.available&&r.result?.exitCode===0,detail:r};}return {tools,ready:Boolean(tools.apksigner.available&&tools.keytool.available)};
  }

  async #signApk({profileId='google-play',input,output=null,approved=false}={}){
    if(!approved)return {signed:false,reason:'APPROVAL_REQUIRED'};const p=this.kratos.signingProfile(profileId);if(!p)return {signed:false,reason:'SIGNING_PROFILE_NOT_FOUND'};
    if(!this.env[p.passwordEnv]||!this.env[p.keyPasswordEnv])return {signed:false,reason:'PASSWORD_ENV_UNAVAILABLE',required:[p.passwordEnv,p.keyPasswordEnv]};
    const source=this.#assertInside(input);await stat(source);const target=this.#assertInside(output??source.replace(/\.apk$/i,'-signed.apk'));
    const argv=['apksigner','sign','--ks',p.keystorePathRef,'--ks-key-alias',p.alias,'--ks-pass',`env:${p.passwordEnv}`,'--key-pass',`env:${p.keyPasswordEnv}`,'--out',target,source];
    const run=await this.#run(argv,{sideEffect:'L',timeoutMs:180000});return {signed:run.available&&run.result?.exitCode===0,input:source,output:target,run};
  }

  async #livePackages(){const r=await this.#run(['adb','shell','pm','list','packages']);if(!r.available||r.result?.exitCode!==0)return {available:false,detail:r};const apps=String(r.result.stdout??'').split(/\r?\n/).map(x=>x.replace(/^package:/,'').trim()).filter(Boolean).sort();return {available:true,apps,count:apps.length};}

  async #developerOptions(){
    const dev=await this.#run(['adb','shell','settings','get','global','development_settings_enabled']);const adb=await this.#run(['adb','shell','settings','get','global','adb_enabled']);
    if(!dev.available||!adb.available)return {available:false,developmentSettings:null,adbEnabled:null,details:{dev,adb}};
    return {available:true,developmentSettings:String(dev.result.stdout).trim()==='1',adbEnabled:String(adb.result.stdout).trim()==='1'};
  }

  async #atreusDoctor(){
    const state=await this.#run(['adb','get-state']);const batt=await this.#run(['adb','shell','dumpsys','battery']);const disk=await this.#run(['adb','shell','df','-k','/data']);const options=await this.#developerOptions();
    if(!state.available)return {available:false,reason:'ADB_UNAVAILABLE',details:{state}};
    const batteryText=String(batt.result?.stdout??'');const level=Number(batteryText.match(/level:\s*(\d+)/i)?.[1]??NaN);
    const lines=String(disk.result?.stdout??'').trim().split(/\r?\n/);const cols=(lines.at(-1)??'').trim().split(/\s+/);const totalKb=Number(cols[1]),availKb=Number(cols[3]);
    const health=this.atreus.interpretHealth({adbState:String(state.result?.stdout??'').trim(),batteryLevel:Number.isFinite(level)?level:null,totalBytes:Number.isFinite(totalKb)?totalKb*1024:null,freeBytes:Number.isFinite(availKb)?availKb*1024:null,developerOptions:options.developmentSettings===true,adbEnabled:options.adbEnabled===true});
    return {available:true,health,developerOptions:options};
  }

  async #setDeveloperOption(payload){const plan=this.atreus.devOptionPlan(payload);if(!plan.allowed)return plan;const run=await this.#run(plan.argv,{sideEffect:'L'});return {...plan,executed:run.available&&run.result?.exitCode===0,run};}

  async #save(){
    const state={version:20,activeAgent:this.activeAgent,thor:{automationMode:this.thor.automation().mode,tasks:this.thor.list()},loki:this.loki.ranked(),kratos:{secretRefs:this.kratos.listSecretRefs(),signingProfiles:[...this.kratos.signingProfiles.values()]},ragnar:{snapshots:this.ragnar.snapshots,coverage:[...this.ragnar.coverage.values()],discoveries:[...this.ragnar.discoveries.values()]},floki:{entries:this.floki.catalog(),changes:this.floki.changes},harald:{connectors:this.harald.connectorsList(),signals:[...this.harald.signals.values()],proposals:this.harald.projects()},ivar:{providers:this.ivar.providersList(),projects:[...this.ivar.projects.values()]},accounts:this.tunnels.snapshot(),wieszcz:{benchmarks:[...this.wieszcz.benchmarks.values()],offers:this.wieszcz.offersList(),orders:[...this.wieszcz.orders.values()],tenders:this.wieszcz.rankedTenders(),publishers:this.wieszcz.publishersList(),consents:this.wieszcz.consentsList()},savedAt:new Date().toISOString()};
    await writeJsonAtomic(this.statePath,state);return {path:this.statePath,version:20,counts:{thorTasks:state.thor.tasks.length,loki:state.loki.length,secrets:state.kratos.secretRefs.length,floki:state.floki.entries.length,haraldProjects:state.harald.proposals.length,ivarProjects:state.ivar.projects.length,offers:state.wieszcz.offers.length}};
  }

  async #load(){
    let state=await readJson(this.statePath,null);if(!state)state=await readJson(this.legacyStatePath,{version:20});this.activeAgent=state.activeAgent??'thor';
    if(state.thor?.automationMode)this.thor.setAutomationMode(state.thor.automationMode);this.thor.restore(state.thor?.tasks??state.thorTasks??[]);this.loki.restore(state.loki??[]);this.kratos.restore(state.kratos??{});this.ragnar.restore(state.ragnar??{});this.floki.restore(state.floki??{});this.tunnels.restore(state.accounts??[]);this.harald.restore(state.harald??{});this.ivar.restore(state.ivar??{});this.wieszcz.restore(state.wieszcz??{});return {loaded:true,version:state.version??20,activeAgent:this.activeAgent};
  }
}
