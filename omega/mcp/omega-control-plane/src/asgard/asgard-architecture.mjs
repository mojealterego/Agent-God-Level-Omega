import { createHash, randomUUID } from 'node:crypto';

function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));
  return value;
}
export function sha256(value){return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(stable(value))).digest('hex');}
function finite(v,f=0){const n=Number(v);return Number.isFinite(n)?n:f;}
function clamp01(v){return Math.max(0,Math.min(1,finite(v)));}
function norm(s){return String(s??'').trim().toLowerCase();}

export const ASGARD_CATEGORIES = Object.freeze([
  'CORE','RESEARCH','SECURITY','AUTOMATION','KNOWLEDGE','DEVICE','AI','MCP','SKILLS','TOOLS','PLUGINS',
  'WEB','MOBILE','ANDROID','GAMES','MONETIZATION','QA','RELEASE','CLOUD','DATA','MEDIA','DESIGN','CODE','NO_CODE',
  'ACCOUNTS','RESEARCH_BROKER','REPORTING','COMMERCE','SALES','FULFILLMENT'
]);

const MAIN_AGENTS = [
  {id:'thor',name:'Thor',kind:'PRIMARY',category:'CORE',parent:null,capabilities:['task-intake','decompose','delegate','merge','final-product','plugin-build','mcp-build','skill-build','agent-build','tool-build','system-build','web-build','mobile-build','android-build','game-build']},
  {id:'loki',name:'Loki',kind:'PRIMARY',category:'RESEARCH',parent:'thor',capabilities:['market-research','ai-ecosystem-scan','niche-discovery','demand-analysis','competition-analysis','monetization-analysis','opportunity-handoff']},
  {id:'kratos',name:'Kratos',kind:'PRIMARY',category:'SECURITY',parent:'thor',capabilities:['secret-governance','api-key-references','android-signing','google-play-security','monetization-security','ads-security','release-signing']},
  {id:'ragnar',name:'Ragnar',kind:'PRIMARY',category:'AUTOMATION',parent:'thor',capabilities:['inventory-diff','automation-gap-analysis','provider-discovery','app-discovery','service-discovery','model-discovery']},
  {id:'floki',name:'Floki',kind:'PRIMARY',category:'KNOWLEDGE',parent:'thor',capabilities:['catalog-curation','change-ledger','category-index','release-notes','provenance','status-rollup']},
  {id:'atreus',name:'Atreus',kind:'PRIMARY',category:'DEVICE',parent:'thor',capabilities:['android-device-health','adb-diagnostics','developer-options','installed-apps','device-repair-plan','mobile-evidence']},
  {id:'harald',name:'Harald',kind:'PRIMARY',category:'ACCOUNTS',parent:'thor',capabilities:['account-connector-fabric','mail-intelligence','drive-intelligence','repo-intelligence','account-ai-signal-mining','project-proposal-handoff']},
  {id:'ivar',name:'Ivar',kind:'PRIMARY',category:'RESEARCH_BROKER',parent:'thor',capabilities:['research-provider-broker','deep-research-fanout','research-result-merge','chatgpt-research-handoff','gemini-research-handoff','gemini-interactions-api','cross-model-collaboration','background-research']},
  {id:'kronikarz',name:'Kronikarz',kind:'PRIMARY',category:'REPORTING',parent:'thor',capabilities:['weekly-newsroom','professional-pdf-report','completed-work-summary','next-week-plan']},
  {id:'wieszcz',name:'Wieszcz',kind:'PRIMARY',category:'COMMERCE',parent:'thor',capabilities:['market-pricing','catalog-publishing','order-intake','digital-fulfillment','implementation-scheduling','payment-broker','tender-analysis','adult-consent-gating']}
];

const DOMAIN_AGENTS = [
  ['plugin-engineer','Plugin Engineer','PLUGINS','thor',['plugin-build','plugin-package','plugin-validate']],
  ['mcp-engineer','MCP Engineer','MCP','thor',['mcp-build','mcp-test','mcp-package']],
  ['skill-engineer','Skill Engineer','SKILLS','thor',['skill-build','skill-eval','skill-package']],
  ['tool-engineer','Tool Engineer','TOOLS','thor',['tool-build','tool-schema','tool-test']],
  ['ai-agent-engineer','AI Agent Engineer','AI','thor',['agent-build','agent-runtime','multi-agent-system']],
  ['code-agent-engineer','Code Agent Engineer','CODE','thor',['code-agent-build','repo-agent','coding-workflow']],
  ['nocode-agent-engineer','No-Code Agent Engineer','NO_CODE','thor',['no-code-agent-build','automation-flow','workflow-spec']],
  ['web-engineer','Web App Engineer','WEB','thor',['web-build','web-test','web-release']],
  ['android-engineer','Android Engineer','ANDROID','thor',['android-build','apk-build','aab-build','android-test']],
  ['mobile-engineer','Native Mobile Engineer','MOBILE','thor',['mobile-build','mobile-test','mobile-release']],
  ['game-engineer','Android Game Engineer','GAMES','thor',['game-build','game-loop','game-monetization','apk-build']],
  ['monetization-engineer','Monetization Engineer','MONETIZATION','kratos',['ads-plan','iap-plan','subscription-plan','pricing-plan']],
  ['qa-release-engineer','QA & Release Engineer','QA','thor',['test-plan','quality-gate','artifact-verify','release-gate']],
  ['cloud-engineer','Cloud Engineer','CLOUD','thor',['cloud-deploy','runtime-hosting','service-integration']],
  ['data-engineer','Data Engineer','DATA','thor',['data-pipeline','database','analytics']],
  ['media-engineer','Media Engineer','MEDIA','thor',['image-pipeline','video-pipeline','audio-pipeline']],
  ['design-engineer','Design Engineer','DESIGN','thor',['ui-ux','design-system','visual-spec']],
  ['security-engineer','Security Engineer','SECURITY','kratos',['threat-model','secret-governance','security-review']],
  ['automation-engineer','Automation Engineer','AUTOMATION','ragnar',['automation-gap-analysis','automation-flow','integration-build']],
  ['market-analyst','Market Analyst','RESEARCH','loki',['market-research','niche-discovery','competition-analysis']],
  ['knowledge-curator','Knowledge Curator','KNOWLEDGE','floki',['catalog-curation','provenance','change-ledger']],
  ['android-device-engineer','Android Device Engineer','DEVICE','atreus',['adb-diagnostics','developer-options','installed-apps']],
  ['account-intelligence-agent','Account Intelligence Agent','ACCOUNTS','harald',['mail-intelligence','drive-intelligence','repo-intelligence']],
  ['research-broker-agent','Research Broker Agent','RESEARCH_BROKER','ivar',['deep-research-fanout','research-result-merge','cross-model-collaboration']],
  ['newsroom-editor','Mojealterego News Editor','REPORTING','kronikarz',['weekly-newsroom','professional-pdf-report']],
  ['pricing-analyst','Pricing Analyst','COMMERCE','wieszcz',['market-pricing','pricing-plan']],
  ['tender-scout','Tender Scout','SALES','wieszcz',['tender-analysis','market-research']],
  ['order-manager','Order Manager','SALES','wieszcz',['order-intake','implementation-scheduling']],
  ['payment-broker','Payment Broker','COMMERCE','wieszcz',['payment-broker']],
  ['fulfillment-coordinator','Fulfillment Coordinator','FULFILLMENT','wieszcz',['digital-fulfillment','implementation-scheduling']],
  ['adult-consent-compliance','Adult Consent Compliance','COMMERCE','wieszcz',['adult-consent-gating']]
].map(([id,name,category,parent,capabilities])=>({id,name,kind:'DOMAIN',category,parent,capabilities}));

export class AgentDirectory {
  constructor(){this.agents=new Map([...MAIN_AGENTS,...DOMAIN_AGENTS].map(a=>[a.id,{...a,status:'AVAILABLE'}]));}
  list({category=null,includeDomain=true}={}){
    return [...this.agents.values()].filter(a=>(!category||a.category===category)&&(includeDomain||a.kind==='PRIMARY')).map(a=>structuredClone(a));
  }
  card(idOrName){const q=norm(idOrName);const a=[...this.agents.values()].find(x=>norm(x.id)===q||norm(x.name)===q);if(!a)throw new Error(`Unknown agent ${idOrName}`);return structuredClone(a);}
  categories(){return ASGARD_CATEGORIES.map(category=>({category,agents:this.list({category}).map(a=>a.id)})).filter(x=>x.agents.length);}
  byCapability(capability){return [...this.agents.values()].filter(a=>a.status==='AVAILABLE'&&a.capabilities.includes(capability)).map(a=>structuredClone(a));}
  setStatus(id,status){const a=this.card(id);const rec=this.agents.get(a.id);rec.status=status;return structuredClone(rec);}
}

const ROUTES = [
  {pattern:/\b(plugin|wtyczk)/i,caps:['plugin-build','plugin-validate']},
  {pattern:/\b(mcp|model context protocol)/i,caps:['mcp-build','mcp-test']},
  {pattern:/\b(skill|umiejętno|umiejetno)/i,caps:['skill-build','skill-eval']},
  {pattern:/\b(tool|narzęd|narzed)/i,caps:['tool-build','tool-test']},
  {pattern:/\b(agent|multi-agent|system agent)/i,caps:['agent-build','multi-agent-system']},
  {pattern:/\b(no[- ]?code|activepieces|n8n|flow)/i,caps:['no-code-agent-build','automation-flow']},
  {pattern:/\b(web|stron|frontend|backend|saas)/i,caps:['web-build','web-test']},
  {pattern:/\b(android|apk|aab|play store|google play)/i,caps:['android-build','apk-build','aab-build']},
  {pattern:/\b(gra|game)/i,caps:['game-build','game-monetization']},
  {pattern:/\b(reklam|ads|admob|monetyzac|iap|subscription)/i,caps:['ads-plan','iap-plan','pricing-plan']},
  {pattern:/\b(test|qa|verify|weryfik|release|wydan)/i,caps:['test-plan','quality-gate','artifact-verify']},
  {pattern:/\b(chmura|cloud|deploy|hosting)/i,caps:['cloud-deploy','runtime-hosting']},
  {pattern:/\b(bezpiecz|security|secret|api key|klucz)/i,caps:['secret-governance','security-review']},
  {pattern:/\b(foto|image|video|audio|media)/i,caps:['image-pipeline','video-pipeline']},
  {pattern:/\b(ui|ux|design|grafik)/i,caps:['ui-ux','design-system']}
];

export class ThorOrchestrator {
  constructor({directory=new AgentDirectory(),automationMode='GUARDED'}={}){this.directory=directory;this.tasks=new Map();this.automationMode='GUARDED';this.setAutomationMode(automationMode);}
  submit({id=randomUUID(),goal,deliverables=[],constraints=[],requiredCapabilities=null,priority='NORMAL'}={}){
    if(!goal)throw new Error('goal is required');
    const capabilities=requiredCapabilities?.length?[...new Set(requiredCapabilities)]:this.inferCapabilities(goal);
    if(!capabilities.length)capabilities.push('task-intake');
    const subtasks=this.#buildSubtasks(capabilities);
    const task={id,goal,deliverables:[...deliverables],constraints:[...constraints],priority,capabilities,subtasks,status:'PLANNED',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),final:null};
    this.tasks.set(id,task);return structuredClone(task);
  }
  inferCapabilities(text){const set=new Set();for(const r of ROUTES)if(r.pattern.test(String(text)))for(const c of r.caps)set.add(c);return [...set];}
  setAutomationMode(mode='GUARDED'){const m=String(mode).toUpperCase();if(!['MANUAL','GUARDED','FULL'].includes(m))throw new Error('invalid automation mode');this.automationMode=m;return this.automation();}
  automation(){return {mode:this.automationMode,externalCreationAllowed:this.automationMode==='FULL'};}
  canExternalCreate({approved=false}={}){return Boolean(approved||this.automationMode==='FULL');}
  #buildSubtasks(capabilities){
    const seen=new Set();const subs=[];
    for(const capability of capabilities){
      const candidates=this.directory.byCapability(capability).filter(a=>a.id!=='thor');
      const agent=(candidates.find(a=>a.kind==='DOMAIN')??candidates[0]??this.directory.card('thor'));
      const key=`${agent.id}:${capability}`;if(seen.has(key))continue;seen.add(key);
      subs.push({id:randomUUID(),capability,agent:agent.id,parentAgent:agent.parent??'thor',status:'PENDING',required:true,evidence:[],artifacts:[],result:null});
    }
    if(!subs.some(s=>s.capability==='quality-gate'))subs.push({id:randomUUID(),capability:'quality-gate',agent:'qa-release-engineer',parentAgent:'thor',status:'PENDING',required:true,evidence:[],artifacts:[],result:null});
    return subs;
  }
  assign(id){const t=this.#get(id);t.status='IN_PROGRESS';t.updatedAt=new Date().toISOString();return t.subtasks.map(s=>({taskId:t.id,subtaskId:s.id,agent:s.agent,capability:s.capability,status:s.status}));}
  update(id,{subtaskId,status,result=null,evidence=[],artifacts=[]}={}){const t=this.#get(id);const s=t.subtasks.find(x=>x.id===subtaskId);if(!s)throw new Error('unknown subtask');if(!['PENDING','RUNNING','DONE','BLOCKED','FAILED'].includes(status))throw new Error('invalid subtask status');s.status=status;s.result=result;s.evidence=[...new Set([...s.evidence,...evidence])];s.artifacts=[...new Set([...s.artifacts,...artifacts])];t.updatedAt=new Date().toISOString();if(t.subtasks.some(x=>x.status==='FAILED'))t.status='FAILED';return structuredClone(s);}
  finalize(id,{summary='',product=null}={}){
    const t=this.#get(id);const blockers=t.subtasks.filter(s=>s.required&&s.status!=='DONE');
    if(blockers.length)return {done:false,reason:'REQUIRED_SUBTASKS_INCOMPLETE',blockers:blockers.map(b=>({id:b.id,agent:b.agent,capability:b.capability,status:b.status}))};
    const evidence=t.subtasks.flatMap(s=>s.evidence);const artifacts=t.subtasks.flatMap(s=>s.artifacts);
    t.status='DONE';t.final={summary,product,evidence:[...new Set(evidence)],artifacts:[...new Set(artifacts)],completedAt:new Date().toISOString()};t.updatedAt=t.final.completedAt;
    return {done:true,task:structuredClone(t)};
  }
  get(id){return structuredClone(this.#get(id));}
  list(){return [...this.tasks.values()].map(t=>structuredClone(t));}
  restore(records=[]){for(const t of records)this.tasks.set(t.id,structuredClone(t));}
  #get(id){const t=this.tasks.get(id);if(!t)throw new Error(`Unknown Thor task ${id}`);return t;}
}

export class LokiMarketIntel {
  constructor(){this.records=new Map();}
  ingest(record){
    if(!record?.title)throw new Error('opportunity title required');const id=record.id??sha256(`${record.title}:${record.problem??''}`).slice(0,16);
    const scores={demand:clamp01(record.scores?.demand),competition:clamp01(record.scores?.competition),monetization:clamp01(record.scores?.monetization),buildability:clamp01(record.scores?.buildability),strategicFit:clamp01(record.scores?.strategicFit)};
    const score=.30*scores.demand+.20*(1-scores.competition)+.20*scores.monetization+.15*scores.buildability+.15*scores.strategicFit;
    const rec={id,title:String(record.title),problem:record.problem??'',category:record.category??'AI',evidence:[...(record.evidence??[])],competitors:[...(record.competitors??[])],monetization:[...(record.monetization??[])],scores,score,sourceDate:record.sourceDate??new Date().toISOString(),status:record.status??'DISCOVERED',recommendedExecutor:record.recommendedExecutor??null};
    this.records.set(id,rec);return structuredClone(rec);
  }
  ranked({minScore=0,category=null}={}){return [...this.records.values()].filter(r=>r.score>=minScore&&(!category||r.category===category)).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map(r=>structuredClone(r));}
  handoff(id,{executor=null}={}){const r=this.records.get(id);if(!r)throw new Error('unknown opportunity');r.status='HANDED_TO_THOR';r.recommendedExecutor=executor??r.recommendedExecutor??'thor';return structuredClone(r);}
  restore(records=[]){for(const r of records)this.records.set(r.id,structuredClone(r));}
}

const SECRET_LIKE=/(?:^|[_-])(token|secret|password|passwd|api[_-]?key|private[_-]?key)(?:$|[_-])/i;
export class KratosSecurity {
  constructor(){this.secretRefs=new Map();this.signingProfiles=new Map();}
  registerSecretRef({id,provider,envRef=null,fileRef=null,rotationDays=90,scope='PROJECT'}={}){
    if(!id||!provider)throw new Error('id and provider required');if(!envRef&&!fileRef)throw new Error('envRef or fileRef required');
    for(const v of [envRef,fileRef])if(v&&/\s/.test(v))throw new Error('secret reference contains whitespace');
    const r={id,provider,envRef,fileRef,rotationDays:Math.max(1,finite(rotationDays,90)),scope,lastRotatedAt:null,registeredAt:new Date().toISOString()};this.secretRefs.set(id,r);return structuredClone(r);
  }
  rejectRawSecretObject(obj){for(const [k,v] of Object.entries(obj??{})){if(SECRET_LIKE.test(k)&&typeof v==='string'&&v.length>=8&&!/^\$?[A-Z][A-Z0-9_]*$/.test(v)&&!String(v).startsWith('env:'))return {safe:false,field:k};}return {safe:true};}
  listSecretRefs(){return [...this.secretRefs.values()].map(x=>structuredClone(x));}
  registerSigningProfile({id='google-play',keystorePathRef,alias,passwordEnv,keyPasswordEnv=null,packageName=null}={}){
    if(!keystorePathRef||!alias||!passwordEnv)throw new Error('keystorePathRef, alias and passwordEnv required');const r={id,keystorePathRef,alias,passwordEnv,keyPasswordEnv:keyPasswordEnv??passwordEnv,packageName,registeredAt:new Date().toISOString()};this.signingProfiles.set(id,r);return structuredClone(r);
  }
  signingProfile(id='google-play'){const p=this.signingProfiles.get(id);return p?structuredClone(p):null;}
  monetizationPlan({productType='app',ads=true,iap=false,subscription=false,provider='admob'}={}){return {productType,ads:Boolean(ads),iap:Boolean(iap),subscription:Boolean(subscription),provider,securityRequirements:['server-side entitlement verification when applicable','no secrets embedded in APK/AAB','consent/privacy configuration','test ad units before production','release signing verification'],credentialsStored:false};}
  restore({secretRefs=[],signingProfiles=[]}={}){for(const x of secretRefs)this.secretRefs.set(x.id,structuredClone(x));for(const x of signingProfiles)this.signingProfiles.set(x.id,structuredClone(x));}
}

export class RagnarAutomationScout {
  constructor(){this.snapshots=[];this.coverage=new Map();this.discoveries=new Map();}
  snapshot({apps=[],services=[],providers=[],models=[],at=new Date().toISOString()}={}){const snap={id:randomUUID(),apps:[...new Set(apps)].sort(),services:[...new Set(services)].sort(),providers:[...new Set(providers)].sort(),models:[...new Set(models)].sort(),at};const prev=this.snapshots.at(-1);this.snapshots.push(snap);return {snapshot:structuredClone(snap),diff:this.diff(prev,snap)};}
  diff(a,b){const d=(x,y)=>y.filter(v=>!x.includes(v));if(!a)return {newApps:b.apps,newServices:b.services,newProviders:b.providers,newModels:b.models};return {newApps:d(a.apps,b.apps),newServices:d(a.services,b.services),newProviders:d(a.providers,b.providers),newModels:d(a.models,b.models)};}
  coverageSet({id,automated=false,coverage=0,notes=''}={}){if(!id)throw new Error('id required');const r={id,automated:Boolean(automated),coverage:clamp01(coverage),notes,updatedAt:new Date().toISOString()};this.coverage.set(id,r);return structuredClone(r);}
  gaps(items=[]){return items.map(id=>this.coverage.get(id)??{id,automated:false,coverage:0,notes:'UNASSESSED'}).filter(x=>!x.automated||x.coverage<.95).sort((a,b)=>a.coverage-b.coverage||a.id.localeCompare(b.id));}
  ingestDiscovery(record={}){if(!record.title)throw new Error('discovery title required');const kind=String(record.kind??'AUTOMATION_OPPORTUNITY').toUpperCase();const scores={value:clamp01(record.scores?.value),relevance:clamp01(record.scores?.relevance),credibility:clamp01(record.scores?.credibility),urgency:clamp01(record.scores?.urgency),automationPotential:clamp01(record.scores?.automationPotential)};const score=.28*scores.value+.25*scores.relevance+.20*scores.credibility+.12*scores.urgency+.15*scores.automationPotential;const id=record.id??sha256(`${kind}:${record.title}:${record.url??''}`).slice(0,16);const rec={id,kind,title:String(record.title),url:record.url??null,provider:record.provider??null,expiresAt:record.expiresAt??null,evidence:[...(record.evidence??[])],scores,score,status:record.status??'DISCOVERED',at:record.at??new Date().toISOString()};this.discoveries.set(id,rec);return structuredClone(rec);}
  rankedDiscoveries({kind=null,minScore=0}={}){return [...this.discoveries.values()].filter(x=>(!kind||x.kind===kind)&&x.score>=minScore).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).map(x=>structuredClone(x));}
  restore({snapshots=[],coverage=[],discoveries=[]}={}){this.snapshots=snapshots.map(x=>structuredClone(x));for(const x of coverage)this.coverage.set(x.id,structuredClone(x));for(const x of discoveries)this.discoveries.set(x.id,structuredClone(x));}
}

export class FlokiCatalog {
  constructor(){this.entries=new Map();this.changes=[];}
  record({id=randomUUID(),category,item,status='UPDATED',version=null,provenance=[],artifacts=[],notes=''}={}){if(!category||!item)throw new Error('category and item required');const rec={id,category,item,status,version,provenance:[...provenance],artifacts:[...artifacts],notes,at:new Date().toISOString()};this.entries.set(`${category}:${item}`,rec);this.changes.push(rec);return structuredClone(rec);}
  catalog({category=null}={}){return [...this.entries.values()].filter(x=>!category||x.category===category).sort((a,b)=>a.category.localeCompare(b.category)||a.item.localeCompare(b.item)).map(x=>structuredClone(x));}
  summary(){const byCategory={};for(const x of this.entries.values())byCategory[x.category]=(byCategory[x.category]??0)+1;return {total:this.entries.size,changes:this.changes.length,byCategory,lastChange:this.changes.at(-1)?.at??null};}
  restore({entries=[],changes=[]}={}){for(const x of entries)this.entries.set(`${x.category}:${x.item}`,structuredClone(x));this.changes=changes.map(x=>structuredClone(x));}
}

const SAFE_DEV_OPTIONS=new Set(['stay_on_while_plugged_in','window_animation_scale','transition_animation_scale','animator_duration_scale','show_touches','pointer_location']);
export class AtreusDeviceSupervisor {
  constructor(){this.lastHealth=null;}
  interpretHealth({adbState='unknown',batteryLevel=null,freeBytes=null,totalBytes=null,developerOptions=false,adbEnabled=false}={}){
    const issues=[];if(adbState!=='device')issues.push('ADB_NOT_READY');if(batteryLevel!=null&&batteryLevel<15)issues.push('LOW_BATTERY');if(freeBytes!=null&&totalBytes&&freeBytes/totalBytes<.08)issues.push('LOW_STORAGE');if(!developerOptions)issues.push('DEVELOPER_OPTIONS_DISABLED');if(!adbEnabled)issues.push('ADB_DISABLED');
    const health={ok:issues.length===0,issues,adbState,batteryLevel,freeBytes,totalBytes,developerOptions,adbEnabled,checkedAt:new Date().toISOString()};this.lastHealth=health;return structuredClone(health);
  }
  devOptionPlan({name,value,approved=false}={}){if(!SAFE_DEV_OPTIONS.has(name))return {allowed:false,reason:'OPTION_NOT_ALLOWLISTED'};if(!approved)return {allowed:false,reason:'APPROVAL_REQUIRED'};return {allowed:true,argv:['adb','shell','settings','put','global',name,String(value)]};}
}

export class ArtifactFactory {
  createSpec({type,name,description='',capabilities=[],tools=[]}={}){
    if(!type||!name)throw new Error('type and name required');const slug=norm(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!slug)throw new Error('invalid name');
    const supported=new Set(['skill','mcp','plugin','tool','code-agent','no-code-agent','agent-system']);if(!supported.has(type))throw new Error(`unsupported factory type ${type}`);
    return {type,name,slug,description,capabilities:[...capabilities],tools:[...tools],createdAt:new Date().toISOString()};
  }
}


const AI_SIGNAL_RE=/\b(ai|artificial intelligence|agent|mcp|llm|model|gemini|chatgpt|openai|anthropic|grant|startup|cloud credit|gpu|android|automation|plugin|skill|tool)\b/i;
export class HaraldAccountIntel {
  constructor(){this.connectors=new Map();this.signals=new Map();this.proposals=new Map();}
  registerConnector({id,service,accountLabel=null,transport='HOST_CONNECTOR',providerId=null,toolName=null,scopes=[],authorized=false}={}){
    if(!id||!service)throw new Error('id and service required');const t=String(transport).toUpperCase();if(!['HOST_CONNECTOR','MCP_FEDERATION'].includes(t))throw new Error('unsupported connector transport');
    const rec={id,service:String(service).toUpperCase(),accountLabel,transport:t,providerId,toolName,scopes:[...new Set(scopes)],authorized:Boolean(authorized),tunnelClaimed:false,secretStored:false,registeredAt:new Date().toISOString()};this.connectors.set(id,rec);return structuredClone(rec);
  }
  connectorsList(){return [...this.connectors.values()].map(x=>structuredClone(x));}
  connector(id){const x=this.connectors.get(id);if(!x)throw new Error(`unknown connector ${id}`);return structuredClone(x);}
  ingest({connectorId,items=[]}={}){const c=this.connector(connectorId);let accepted=0;for(const raw of items){const text=`${raw.title??''} ${raw.text??raw.summary??''}`;if(!AI_SIGNAL_RE.test(text)&&!(raw.tags??[]).some(x=>AI_SIGNAL_RE.test(String(x))))continue;const id=raw.id??sha256(`${connectorId}:${raw.url??''}:${text}`).slice(0,20);const signal={id,connectorId,service:c.service,title:String(raw.title??'AI signal'),text:String(raw.text??raw.summary??''),url:raw.url??null,at:raw.at??new Date().toISOString(),tags:[...(raw.tags??[])],provenance:{connectorId,service:c.service,accountLabel:c.accountLabel}};this.signals.set(id,signal);this.#proposalFromSignal(signal);accepted++;}return {accepted,totalSignals:this.signals.size,connectorId};}
  #proposalFromSignal(s){const id=sha256(`project:${s.id}`).slice(0,16);if(!this.proposals.has(id))this.proposals.set(id,{id,title:s.title,brief:s.text,sourceSignals:[s.id],status:'PROPOSED',category:/grant|credit/i.test(`${s.title} ${s.text}`)?'FUNDING':'AI',createdAt:new Date().toISOString()});return this.proposals.get(id);}
  projects(){return [...this.proposals.values()].map(x=>structuredClone(x));}
  handoff(id){const p=this.proposals.get(id);if(!p)throw new Error('unknown Harald project');p.status='HANDED_TO_THOR';p.handedAt=new Date().toISOString();return structuredClone(p);}
  restore({connectors=[],signals=[],proposals=[]}={}){for(const x of connectors)this.connectors.set(x.id,structuredClone(x));for(const x of signals)this.signals.set(x.id,structuredClone(x));for(const x of proposals)this.proposals.set(x.id,structuredClone(x));}
}

export class IvarResearchBroker {
  constructor(){this.providers=new Map();this.projects=new Map();}
  registerProvider({id,kind,transport='HOST_ORCHESTRATION',providerId=null,toolName=null,authorized=false,metadata={}}={}){if(!id||!kind)throw new Error('id and kind required');const t=String(transport).toUpperCase();if(!['HOST_ORCHESTRATION','MCP_FEDERATION','GEMINI_INTERACTIONS_API'].includes(t))throw new Error('unsupported research transport');const p={id,kind:String(kind).toUpperCase(),transport:t,providerId,toolName,authorized:Boolean(authorized),metadata:{...metadata},vpnClaimed:false,registeredAt:new Date().toISOString()};this.providers.set(id,p);return structuredClone(p);}
  providersList(){return [...this.providers.values()].map(x=>structuredClone(x));}
  createProject({id=randomUUID(),title,brief,requiredProviders=['CHATGPT','GEMINI'],metadata={}}={}){if(!title||!brief)throw new Error('title and brief required');const p={id,title,brief,requiredProviders:requiredProviders.map(x=>String(x).toUpperCase()),metadata,status:'PLANNED',results:{},jobs:{},createdAt:new Date().toISOString()};this.projects.set(id,p);return structuredClone(p);}
  dispatchPlan(id){const p=this.projects.get(id);if(!p)throw new Error('unknown research project');const jobs=[];for(const kind of p.requiredProviders){const provider=[...this.providers.values()].reverse().find(x=>x.kind===kind&&x.authorized);jobs.push({kind,providerId:provider?.id??null,available:Boolean(provider),transport:provider?.transport??null});}return {projectId:id,jobs,vpnClaimed:false,allProvidersAvailable:jobs.every(x=>x.available)};}
  recordJob(id,{providerId,interactionId=null,status='IN_PROGRESS',metadata={}}={}){const p=this.projects.get(id);if(!p)throw new Error('unknown research project');if(!providerId)throw new Error('providerId required');p.jobs[providerId]={providerId,interactionId,status,metadata:{...metadata},at:new Date().toISOString()};p.status='IN_PROGRESS';return structuredClone(p.jobs[providerId]);}
  recordResult(id,{providerId,result,evidence=[]}={}){const p=this.projects.get(id);if(!p)throw new Error('unknown research project');if(!providerId)throw new Error('providerId required');p.results[providerId]={result,evidence:[...evidence],at:new Date().toISOString()};if(p.jobs?.[providerId])p.jobs[providerId].status='DONE';const completedKinds=new Set(Object.keys(p.results).map(pid=>this.providers.get(pid)?.kind).filter(Boolean));p.status=p.requiredProviders.every(kind=>completedKinds.has(kind))?'READY_TO_SYNTHESIZE':'IN_PROGRESS';return structuredClone(p);}
  synthesisPacket(id){const p=this.projects.get(id);if(!p)throw new Error('unknown research project');const results=Object.entries(p.results).map(([providerId,value])=>({providerId,kind:this.providers.get(providerId)?.kind??'UNKNOWN',...structuredClone(value)}));const present=new Set(results.map(x=>x.kind));const missing=p.requiredProviders.filter(x=>!present.has(x));return {projectId:id,title:p.title,brief:p.brief,status:p.status,results,missingProviders:missing,ready:missing.length===0,mergeInstruction:'Compare evidence, surface disagreements, preserve citations/provenance, select the strongest supported elements, and hand the synthesized implementation brief to Thor.'};}
  get(id){const p=this.projects.get(id);if(!p)throw new Error('unknown research project');return structuredClone(p);}
  restore({providers=[],projects=[]}={}){for(const x of providers)this.providers.set(x.id,structuredClone(x));for(const x of projects){const copy=structuredClone(x);copy.jobs??={};this.projects.set(x.id,copy);}}
}

export class KronikarzNewsroom {
  buildEdition({from,to,completed=[],planned=[],market=[],accounts=[],issue=null}={}){
    const dateTo=to??new Date().toISOString().slice(0,10);const dateFrom=from??dateTo;const sections=[
      {title:'Wykonane',items:completed.map(x=>({title:x.title??x.item??'Pozycja',summary:x.summary??x.notes??''}))},
      {title:'Rynek i sygnały',items:market.map(x=>({title:x.title??'Sygnał',summary:x.summary??x.problem??x.text??''}))},
      {title:'Plan na kolejny tydzień',items:planned.map(x=>({title:x.title??x.goal??'Plan',summary:x.summary??''}))}
    ];if(accounts.length)sections.splice(2,0,{title:'Sygnały z kont i źródeł',items:accounts.map(x=>({title:x.title??'Sygnał',summary:x.text??''}))});
    return {brand:'Mojealterego News',issue:issue??`${dateTo}`,from:dateFrom,to:dateTo,title:`Mojealterego News — ${dateTo}`,dek:'Tygodniowy przegląd wykonania, rynku i planów ekosystemu ASGARD',sections,generatedAt:new Date().toISOString()};
  }
}

const ADULT_CATEGORIES=new Set(['ADULT_ARTISTIC_NUDE','ADULT_FILM_PRODUCTION','ADULT_SYNTHETIC_MEDIA']);
export class WieszczMarketplace {
  constructor(){this.benchmarks=new Map();this.offers=new Map();this.orders=new Map();this.tenders=new Map();this.publishers=new Map();this.consents=new Map();}
  setMarketBenchmark({category,median,min=null,max=null,currency='PLN',source=null,at=new Date().toISOString()}={}){if(!category||!Number.isFinite(Number(median)))throw new Error('category and numeric median required');const r={category:String(category).toUpperCase(),median:finite(median),min:min==null?null:finite(min),max:max==null?null:finite(max),currency,source,at};this.benchmarks.set(r.category,r);return structuredClone(r);}
  upsertOffer({id,category,title,basePrice=0,currency='PLN',brandPositioningMultiplier=1,complexityMultiplier=1,urgencyMultiplier=1,delivery='DIGITAL',active=true,metadata={}}={}){if(!id||!category||!title)throw new Error('id category title required');const cat=String(category).toUpperCase();const b=this.benchmarks.get(cat);const anchor=Math.max(finite(basePrice),b?.median??0);const brand=Math.max(.5,Math.min(3,finite(brandPositioningMultiplier,1)));const complexity=Math.max(.5,Math.min(5,finite(complexityMultiplier,1)));const urgency=Math.max(1,Math.min(3,finite(urgencyMultiplier,1)));const price=Math.round(anchor*brand*complexity*urgency*100)/100;const r={id,category:cat,title,basePrice:finite(basePrice),price,currency:b?.currency??currency,brandPositioningMultiplier:brand,complexityMultiplier:complexity,urgencyMultiplier:urgency,marketMedian:b?.median??null,delivery,active:Boolean(active),metadata,updatedAt:new Date().toISOString()};this.offers.set(id,r);return structuredClone(r);}
  offersList({category=null}={}){return [...this.offers.values()].filter(x=>!category||x.category===String(category).toUpperCase()).map(x=>structuredClone(x));}
  createOrder(input={}){const id=input.id??randomUUID();const category=String(input.category??this.offers.get(input.offerId)?.category??'GENERAL').toUpperCase();let status='INTAKE',reason=null;const refs=[...(input.consentRefs??[])];const consentRecords=refs.map(x=>this.consents.get(x)).filter(Boolean);const verifiedConsents=refs.length>0&&consentRecords.length===refs.length&&consentRecords.every(x=>x.adultVerified);if(ADULT_CATEGORIES.has(category)||input.adult){if(!input.allParticipantsAdults||!verifiedConsents){status='BLOCKED';reason='ADULT_AND_VERIFIED_CONSENT_REQUIRED';}if(input.syntheticLikeness&&input.identifiableRealPerson&&input.explicitSexual){status='BLOCKED';reason='EXPLICIT_REAL_PERSON_SYNTHETIC_SEXUAL_MEDIA_UNSUPPORTED';}else if(input.syntheticLikeness&&input.identifiableRealPerson&&input.thirdPartyLikeness&&!consentRecords.some(x=>x.notarized)){status='BLOCKED';reason='THIRD_PARTY_LIKENESS_NOTARIZED_CONSENT_REQUIRED';}}
    const r={id,offerId:input.offerId??null,category,status,reason,customerRef:input.customerRef??null,consentRefs:refs,verifiedConsentRefs:consentRecords.map(x=>x.id),allParticipantsAdults:Boolean(input.allParticipantsAdults),requestedAt:new Date().toISOString(),delivery:input.delivery??'DIGITAL',implementationDate:input.implementationDate??null,notes:input.notes??''};this.orders.set(id,r);return structuredClone(r);}
  order(id){const x=this.orders.get(id);return x?structuredClone(x):null;}
  paymentIntent({orderId,provider,amount,currency='PLN',reference=null}={}){return {orderId,provider:String(provider??'EXTERNAL').toUpperCase(),amount:finite(amount),currency,reference,executed:false,externalProviderRequired:true,credentialsStored:false};}
  ingestTender({id=randomUUID(),title,budget=null,deadline=null,requirements=[],fit=.5,evidence=[]}={}){if(!title)throw new Error('tender title required');const r={id,title,budget:budget==null?null:finite(budget),deadline,requirements:[...requirements],fit:clamp01(fit),evidence:[...evidence],status:'DISCOVERED',at:new Date().toISOString()};this.tenders.set(id,r);return structuredClone(r);}
  rankedTenders(){return [...this.tenders.values()].sort((a,b)=>b.fit-a.fit).map(x=>structuredClone(x));}
  registerPublisher({id,kind='WEBSITE',transport='HOST_CONNECTOR',providerId=null,toolName=null,authorized=false}={}){if(!id)throw new Error('publisher id required');const t=String(transport).toUpperCase();if(!['HOST_CONNECTOR','MCP_FEDERATION'].includes(t))throw new Error('unsupported publisher transport');const r={id,kind:String(kind).toUpperCase(),transport:t,providerId,toolName,authorized:Boolean(authorized),secretStored:false,registeredAt:new Date().toISOString()};this.publishers.set(id,r);return structuredClone(r);}
  publishersList(){return [...this.publishers.values()].map(x=>structuredClone(x));}
  registerConsent({id,personRef,adultVerified=false,scope=[],notarized=false,expiresAt=null}={}){if(!id||!personRef)throw new Error('consent id and personRef required');const r={id,personRef,adultVerified:Boolean(adultVerified),scope:[...new Set(scope.map(String))],notarized:Boolean(notarized),expiresAt,registeredAt:new Date().toISOString()};this.consents.set(id,r);return structuredClone(r);}
  consentsList(){return [...this.consents.values()].map(x=>structuredClone(x));}
  updateOrder(id,patch={}){const o=this.orders.get(id);if(!o)throw new Error('unknown order');const allowed=['status','implementationDate','notes','delivery'];for(const k of allowed)if(k in patch)o[k]=patch[k];o.updatedAt=new Date().toISOString();return structuredClone(o);}
  fulfillmentPlan(id){const o=this.orders.get(id);if(!o)throw new Error('unknown order');if(o.status==='BLOCKED')return {orderId:id,ready:false,reason:o.reason};return {orderId:id,ready:true,steps:[{type:'PAYMENT_CONFIRMATION',externalProviderRequired:true},{type:o.delivery==='DIGITAL'?'DIGITAL_DELIVERY':'SERVICE_DELIVERY',requiresArtifact:o.delivery==='DIGITAL'},{type:'IMPLEMENTATION_APPOINTMENT',scheduledAt:o.implementationDate??null}],consentRefs:[...o.consentRefs],adultControls:ADULT_CATEGORIES.has(o.category)};}
  restore({benchmarks=[],offers=[],orders=[],tenders=[],publishers=[],consents=[]}={}){for(const x of benchmarks)this.benchmarks.set(x.category,structuredClone(x));for(const x of offers)this.offers.set(x.id,structuredClone(x));for(const x of orders)this.orders.set(x.id,structuredClone(x));for(const x of tenders)this.tenders.set(x.id,structuredClone(x));for(const x of publishers)this.publishers.set(x.id,structuredClone(x));for(const x of consents)this.consents.set(x.id,structuredClone(x));}
}
