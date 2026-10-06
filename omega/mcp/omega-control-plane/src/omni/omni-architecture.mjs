import { createHash } from 'node:crypto';

function now(){return new Date().toISOString();}
function clone(v){return structuredClone(v);}
function id(prefix,value){return `${prefix}-${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,16)}`;}
function clamp01(v){return Math.max(0,Math.min(1,Number(v)));}

const AUTHORITY_RANK={PROJECT_SCHEMA:9,OFFICIAL_SOURCE:8,OFFICIAL_DOC:7,STANDARD_SPEC:6,PEER_REVIEWED:5,VENDOR_SUPPORT:4,SECONDARY:3,COMMUNITY:2,UNKNOWN:1};

export class EvidenceDecisionLedgerV2 {
  constructor(){this.evidence=new Map();this.decisions=new Map();}
  addEvidence({claim,source,locator=null,observedAt=now(),version=null,evidenceType='OBSERVATION',supports=true,confidence=1,metadata={}}={}){
    if(!claim||!source)throw new Error('claim and source are required');
    const rec={id:id('ev',{claim,source,locator,observedAt,version}),claim:String(claim),source:String(source),locator,observedAt,version,evidenceType,supports:Boolean(supports),confidence:clamp01(confidence),metadata:clone(metadata)};
    this.evidence.set(rec.id,rec);return clone(rec);
  }
  addDecision({question,options=[],evidenceIds=[],constraints=[],decision,rationaleSummary='',confidence=.5,owner='omni',reversible=true,verification=[]}={}){
    if(!question||decision===undefined)throw new Error('question and decision are required');
    for(const eid of evidenceIds)if(!this.evidence.has(eid))throw new Error(`unknown evidence id: ${eid}`);
    const rec={id:id('dec',{question,decision,evidenceIds,ts:Date.now()}),question,options:clone(options),evidenceIds:[...evidenceIds],constraints:clone(constraints),decision:clone(decision),rationaleSummary,confidence:clamp01(confidence),owner,reversible:Boolean(reversible),verification:clone(verification),timestamp:now()};
    this.decisions.set(rec.id,rec);return clone(rec);
  }
  snapshot(){return {evidence:[...this.evidence.values()].map(clone),decisions:[...this.decisions.values()].map(clone)};}
  restore(state={}){this.evidence=new Map((state.evidence??[]).map(x=>[x.id,clone(x)]));this.decisions=new Map((state.decisions??[]).map(x=>[x.id,clone(x)]));}
}

export class SourceOfTruthRegistryV2 {
  constructor(){this.records=new Map();}
  upsert({domain,source,owner='unknown',scope='project',version=null,observedAt=now(),authorityClass='UNKNOWN',priority=0,value=null,fallback=null}={}){
    if(!domain||!source)throw new Error('domain and source are required');
    const key=`${domain}::${source}`;const rec={id:id('sot',{domain,source}),domain,source,owner,scope,version,observedAt,authorityClass,priority:Number(priority),value:clone(value),fallback};
    this.records.set(key,rec);return clone(rec);
  }
  list(domain=null){return [...this.records.values()].filter(x=>!domain||x.domain===domain).map(clone);}
  resolve(domain){
    const candidates=this.list(domain);if(!candidates.length)return {domain,status:'MISSING',selected:null,candidates:[]};
    candidates.sort((a,b)=>{
      const p=b.priority-a.priority;if(p)return p;
      const ar=(AUTHORITY_RANK[b.authorityClass]??0)-(AUTHORITY_RANK[a.authorityClass]??0);if(ar)return ar;
      return String(b.observedAt).localeCompare(String(a.observedAt));
    });
    const selected=candidates[0];const selectedRank=AUTHORITY_RANK[selected.authorityClass]??0;
    const peers=candidates.filter(x=>x.priority===selected.priority&&(AUTHORITY_RANK[x.authorityClass]??0)===selectedRank);
    const hashes=new Set(peers.map(x=>JSON.stringify(x.value)));
    return {domain,status:hashes.size>1?'CONFLICTED':'RESOLVED',selected,candidates,conflicts:hashes.size>1?peers:[]};
  }
  snapshot(){return this.list();}
  restore(records=[]){this.records=new Map(records.map(r=>[`${r.domain}::${r.source}`,clone(r)]));}
}

export class PromptInjectionDefenseV2 {
  audit({text='',source='external',trusted=false}={}){
    const value=String(text);const rules=[
      ['SYSTEM_OVERRIDE',/\b(ignore|disregard|override)\b.{0,60}\b(previous|system|developer|policy|instructions?)\b/i],
      ['ROLE_IMPERSONATION',/^\s*(system|developer|assistant)\s*:/im],
      ['SECRET_EXFILTRATION',/\b(reveal|show|send|exfiltrate|print)\b.{0,80}\b(secret|token|password|api[-_ ]?key|credential)\b/i],
      ['TOOL_COERCION',/\b(run|execute|call|invoke)\b.{0,80}\b(tool|shell|terminal|mcp|command)\b/i],
      ['POLICY_BYPASS',/\b(bypass|disable|ignore)\b.{0,80}\b(safety|guardrail|policy|approval|verification)\b/i]
    ];
    const findings=rules.filter(([,re])=>re.test(value)).map(([code])=>({code,severity:'high'}));
    return {source,trusted:Boolean(trusted),externalData:!trusted,policyEffectAllowed:Boolean(trusted),findings,blocked:!trusted&&findings.length>0,classification:!trusted&&findings.length?'EXTERNAL_UNTRUSTED_INSTRUCTION':'DATA'};
  }
}

export class GitHubEngineeringEngineV2 {
  plan({repository,branch,head,defaultBranch=branch,changes=[],preserveBranch=true,atomic=true}={}){
    if(!repository||!branch||!head)throw new Error('repository, branch and head are required');
    const normalized=changes.map((c,i)=>({id:c.id??`change-${i+1}`,path:String(c.path??''),operation:c.operation??'modify',reason:c.reason??''}));
    if(normalized.some(x=>!x.path))throw new Error('each change requires path');
    return {repository,baseline:{branch,head,defaultBranch},preserveBranch:Boolean(preserveBranch),branchMutationAllowed:!preserveBranch,atomic:Boolean(atomic),changeSet:normalized,requiresReadback:true,releaseClaimed:false};
  }
}

export class RepositoryAuditorV2 {
  audit({repository='unknown',branch='unknown',head='unknown',files=[],workflows=[],tests=[],docs=[],status=[],secretLikePaths=[]}={}){
    const findings=[];
    if(!files.length)findings.push({code:'EMPTY_INVENTORY',severity:'high',evidence:'files=[]'});
    if(!workflows.length)findings.push({code:'NO_CI_WORKFLOW',severity:'medium',evidence:'workflows=[]'});
    if(!tests.length)findings.push({code:'NO_TEST_INVENTORY',severity:'high',evidence:'tests=[]'});
    if(!docs.some(x=>/readme/i.test(x)))findings.push({code:'README_NOT_OBSERVED',severity:'low',evidence:docs});
    for(const p of secretLikePaths)findings.push({code:'SECRET_LIKE_PATH',severity:'critical',evidence:p});
    const dirty=status.filter(x=>String(x).trim()).length;if(dirty)findings.push({code:'WORKTREE_DIRTY',severity:'medium',evidence:{entries:dirty}});
    const score=Math.max(0,100-findings.reduce((s,x)=>s+({low:5,medium:10,high:20,critical:35}[x.severity]??5),0));
    return {repository,baseline:{branch,head},inventory:{files:files.length,workflows:workflows.length,tests:tests.length,docs:docs.length},findings,score,readmeIsImplementationProof:false};
  }
}

export class CiCdVerificationEngineV2 {
  verify({runId=null,commit=null,jobs=[],artifact=null,deployment=null,runtime=null}={}){
    const find=(name)=>jobs.find(j=>String(j.name).toLowerCase().includes(name));const testJob=find('test'),buildJob=find('build');
    const tested=Boolean(testJob&&testJob.status==='completed'&&testJob.conclusion==='success');
    const built=Boolean(buildJob&&buildJob.status==='completed'&&buildJob.conclusion==='success'&&artifact?.exists===true&&artifact?.sha256);
    const deployed=Boolean(deployment?.status==='success'&&(!commit||deployment?.commit===commit));
    const verifiedInRuntime=Boolean(deployed&&runtime?.healthy===true&&runtime?.verifiedAt);
    const pipelineGreen=jobs.length>0&&jobs.every(j=>j.status==='completed'&&j.conclusion==='success');
    return {runId,commit,pipelineGreen,states:{IMPLEMENTED:null,TESTED:tested,BUILT:built,DEPLOYED:deployed,'VERIFIED-IN-RUNTIME':verifiedInRuntime},artifactVerified:built,greenPipelineDoesNotImplyArtifact:Boolean(pipelineGreen&&!built)};
  }
}

export class GoogleIntelligenceV2 {
  constructor({injection=new PromptInjectionDefenseV2()}={}){this.injection=injection;this.records=new Map();}
  ingest({kind,id:rid,sourceRef,observedAt=now(),actor=null,title='',content='',metadata={}}={}){
    if(!['GMAIL','DRIVE','CALENDAR'].includes(kind))throw new Error('kind must be GMAIL, DRIVE or CALENDAR');if(!rid||!sourceRef)throw new Error('id and sourceRef are required');
    const injection=this.injection.audit({text:content,source:sourceRef,trusted:false});const rec={id:rid,kind,sourceRef,observedAt,actor,title,content,metadata:clone(metadata),injection,provenance:{sourceRef,observedAt,kind},instructionAuthority:false};this.records.set(`${kind}:${rid}`,rec);return clone(rec);
  }
  query({kind=null,text=null}={}){const q=text?String(text).toLowerCase():null;return [...this.records.values()].filter(r=>(!kind||r.kind===kind)&&(!q||`${r.title} ${r.content}`.toLowerCase().includes(q))).map(clone);}
  snapshot(){return [...this.records.values()].map(clone);}
  restore(records=[]){this.records=new Map(records.map(r=>[`${r.kind}:${r.id}`,clone(r)]));}
}

export class McpOrchestrationFabricV2 {
  constructor(){this.providers=new Map();}
  register({id:pid,capabilities=[],authorized=false,healthy=true,sideEffect='R',scopes=[]}={}){if(!pid)throw new Error('id required');const rec={id:pid,capabilities:[...new Set(capabilities)],authorized:Boolean(authorized),healthy:Boolean(healthy),sideEffect,scopes:[...new Set(scopes)]};this.providers.set(pid,rec);return clone(rec);}
  route({capability,write=false}={}){if(!capability)throw new Error('capability required');const candidates=[...this.providers.values()].filter(p=>p.authorized&&p.healthy&&p.capabilities.includes(capability)&&(!write||p.sideEffect!=='R')).sort((a,b)=>a.id.localeCompare(b.id));return {capability,write:Boolean(write),selected:candidates[0]??null,candidates:clone(candidates),status:candidates.length?'ROUTED':'UNAVAILABLE'};}
  snapshot(){return [...this.providers.values()].map(clone);}
  restore(records=[]){this.providers=new Map(records.map(r=>[r.id,clone(r)]));}
}

export class AndroidEngineeringEngineV2 {
  gate({compileSdk=null,targetSdk=null,minSdk=null,agp=null,kotlin=null,jdk=null,unitTests=null,lint=null,build=null,artifact=null,signature=null}={}){
    const configComplete=[compileSdk,targetSdk,minSdk,agp,kotlin,jdk].every(x=>x!==null&&x!==undefined);const tested=unitTests?.exitCode===0;const linted=lint?.exitCode===0;const built=build?.exitCode===0&&artifact?.exists===true&&Boolean(artifact?.sha256);const signed=built&&signature?.verified===true;
    return {configComplete,TESTED:Boolean(tested),LINTED:Boolean(linted),BUILT:Boolean(built),SIGNED:Boolean(signed),readyForRelease:Boolean(configComplete&&tested&&linted&&built&&signed),artifactClaimAllowed:Boolean(built)};
  }
}

export class AgentEngineeringEngineV2 {
  spec({name,goal,environment='unknown',tools=[],authority=[],stopConditions=[],successMetrics=[],memory={provenance:true,retention:'bounded'}}={}){if(!name||!goal)throw new Error('name and goal required');return {id:id('agent',{name,goal}),name,goal,environment,tools:clone(tools),authority:clone(authority),stopConditions:clone(stopConditions),successMetrics:clone(successMetrics),memory:clone(memory),ornamentalMultiAgent:false};}
  evaluate({spec,metrics={}}={}){if(!spec?.id)throw new Error('spec required');const missing=(spec.successMetrics??[]).filter(m=>!(m in metrics));const passed=missing.length===0&&(spec.successMetrics??[]).every(m=>Boolean(metrics[m]));return {agentId:spec.id,passed,missing,metrics:clone(metrics),qualityClaimAllowed:passed};}
}

export class CloudInfrastructureEngineV2 {
  gate({provider,region,plan=null,apply=null,health=null,rollback=null,iam=null,network=null}={}){if(!provider||!region)throw new Error('provider and region required');const planned=plan?.observed===true;const applied=planned&&apply?.success===true;const healthy=applied&&health?.healthy===true;const rollbackReady=Boolean(rollback?.ready);const leastPrivilege=iam?.leastPrivilege===true;const exposureBounded=network?.minimalExposure===true;return {provider,region,PLANNED:planned,APPLIED:applied,HEALTHY:healthy,ROLLBACK_READY:rollbackReady,IAM_OK:leastPrivilege,NETWORK_OK:exposureBounded,VERIFIED:Boolean(healthy&&rollbackReady&&leastPrivilege&&exposureBounded)};}
}

export class SystemArchitectureEngineV2 {
  constructor(){this.adrs=new Map();}
  addAdr({title,context,options=[],decision,consequences=[],reversible=true,verification=[]}={}){if(!title||!context||decision===undefined)throw new Error('title, context and decision required');const rec={id:id('adr',{title,decision,ts:Date.now()}),title,context,options:clone(options),decision:clone(decision),consequences:clone(consequences),reversible:Boolean(reversible),verification:clone(verification),createdAt:now()};this.adrs.set(rec.id,rec);return clone(rec);}
  list(){return [...this.adrs.values()].map(clone);}
  restore(records=[]){this.adrs=new Map(records.map(r=>[r.id,clone(r)]));}
}

export const OMNI_V22_COMPETENCY_MAP=Object.freeze({
  'omni-core':['asgard.thor','reality.filter','meta.trace-audit'],
  'evidence-engine':['reality.filter','reality.source-of-truth','omega-omni-ledger-v2'],
  'deep-research':['asgard.ivar','asgard.loki','reality.source-of-truth'],
  'software-engineering':['build.local','verifier.local','repo.git'],
  'blue-team-security':['asgard.kratos','omega-security-trust-kernel','security.command-risk-gate'],
  'github-engineering':['repo.git','ci.hosting','asgard.thor'],
  'repo-auditor':['omega-omni-repo-audit-v2','omega-repository-cartographer'],
  'ci-cd-verifier':['ci.hosting','omega-ci-cd-release-controller','omega-omni-ci-v2'],
  'google-intelligence':['asgard.harald','omega-omni-google-v2'],
  'source-of-truth-registry':['reality.source-of-truth','omega-omni-sot-v2'],
  'decision-evidence-ledger':['omega-decision-trace-audit','omega-omni-ledger-v2'],
  'prompt-injection-defense':['reality.prompt-injection','omega-prompt-injection-epistemic-firewall'],
  'mcp-orchestration':['gateway.mcp','gateway.mcp.remote','omega-mcp-zero-trust-gateway','omega-omni-mcp-v2'],
  'android-engineering':['device.android','ecosystem.android.agent-device','omega-omni-android-v2'],
  'agent-engineering':['asgard.thor','omega-multi-agent-orchestration','omega-stateful-agent-kernel','omega-omni-agent-v2'],
  'cloud-infrastructure':['asgard.freyr','omega-omni-cloud-v2'],
  'system-architecture':['omega-omni-architecture-v2']
});
