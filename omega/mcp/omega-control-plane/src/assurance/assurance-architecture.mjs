import { createHash } from 'node:crypto';

const SEVERITY_WEIGHT = { info: 0, low: 5, medium: 12, high: 25, critical: 40 };
const GRADE_ORDER = { A: 5, B: 4, C: 3, D: 2, F: 1 };
const WRITE_CAPS = new Set(['write','delete','shell','exec','admin','network-write','repo-write','publish','deploy','sign']);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  return value;
}

export function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

function finding(code, severity, message, evidence = {}) { return { code, severity, message, evidence }; }
function normalizePath(path) { return String(path ?? '').replaceAll('\\','/').replace(/^\.\//,''); }
function anyPrefix(path, prefixes = []) { const p = normalizePath(path); return prefixes.some((x) => p === normalizePath(x) || p.startsWith(`${normalizePath(x).replace(/\/$/,'')}/`)); }
function unique(xs) { return [...new Set(xs)]; }

export class ActionSupplyChainAuditor {
  audit({ workflow = '', trustedOwners = ['actions','github'], requireShaForThirdParty = true } = {}) {
    const text = String(workflow ?? '');
    const findings = [];
    const uses = [];
    for (const [index, line] of text.split(/\r?\n/).entries()) {
      const m = line.match(/\buses:\s*([^\s#]+)/);
      if (!m) continue;
      const ref = m[1];
      if (ref.startsWith('./') || ref.startsWith('docker://')) { uses.push({ line:index+1, ref, local:true }); continue; }
      const at = ref.lastIndexOf('@');
      const target = at >= 0 ? ref.slice(0, at) : ref;
      const version = at >= 0 ? ref.slice(at + 1) : '';
      const owner = target.split('/')[0] ?? '';
      const pinned = /^[0-9a-f]{40}$/i.test(version);
      const firstParty = trustedOwners.includes(owner);
      uses.push({ line:index+1, ref, target, version, owner, pinned, firstParty });
      if (!version) findings.push(finding('ACT001','high',`Action ${target} has no version/ref`,{line:index+1,ref}));
      else if (requireShaForThirdParty && !firstParty && !pinned) findings.push(finding('ACT002','high',`Third-party action ${target} is not pinned to an immutable commit SHA`,{line:index+1,ref}));
      else if (!pinned && /^(main|master|latest|v\d+)$/i.test(version)) findings.push(finding('ACT003',firstParty?'medium':'high',`Action ${target} uses a mutable ref`,{line:index+1,ref}));
    }
    if (/\bpull_request_target\s*:/.test(text)) {
      findings.push(finding('ACT004','high','pull_request_target is present; untrusted PR code must never execute with base-repo secrets or write tokens'));
      if (/ref:\s*\$\{\{\s*github\.event\.pull_request\.head/.test(text)) findings.push(finding('ACT005','critical','pull_request_target checks out pull-request head code'));
    }
    if (/permissions:\s*write-all/.test(text)) findings.push(finding('ACT006','critical','Workflow grants write-all permissions'));
    if (/show_full_output:\s*["']?true/i.test(text)) findings.push(finding('ACT007','high','Full agent output is enabled and may expose tool results or secrets'));
    if (/(curl|wget)[^\n|]{0,300}\|\s*(sh|bash)\b|\birm\b[^\n|]{0,300}\|\s*iex\b/i.test(text)) findings.push(finding('ACT008','high','Workflow contains a remote-download pipe-to-shell installer'));
    const writePerms = [...text.matchAll(/^\s{0,8}([a-z-]+):\s*write\s*$/gmi)].map((m)=>m[1]);
    if (writePerms.length > 2) findings.push(finding('ACT009','medium','Workflow grants multiple write permission classes',{writePermissions:unique(writePerms)}));
    const score = Math.max(0, 100 - findings.reduce((n,f)=>n+(SEVERITY_WEIGHT[f.severity]??0),0));
    return { score, passed: !findings.some((f)=>['high','critical'].includes(f.severity)), uses, findings, policy: { requireShaForThirdParty, trustedOwners } };
  }
}

export class LandingPolicyEngine {
  normalize(policy = {}) {
    return {
      requiredChecks: unique((policy.requiredChecks ?? []).map(String)).sort(),
      ackPaths: unique((policy.ackPaths ?? []).map(normalizePath)).sort(),
      maxAgents: Math.max(1, Number(policy.maxAgents ?? 16)),
      maxBudget: Math.max(0, Number(policy.maxBudget ?? Number.MAX_SAFE_INTEGER)),
      minMcpGrade: String(policy.minMcpGrade ?? 'B').toUpperCase(),
      requirePinnedActions: policy.requirePinnedActions !== false,
      lanes: (policy.lanes ?? []).map((x)=>({ id:String(x.id), paths:unique((x.paths??[]).map(normalizePath)) }))
    };
  }
  compare({ base = {}, candidate = {} } = {}) {
    const a=this.normalize(base), b=this.normalize(candidate); const violations=[];
    for (const check of a.requiredChecks) if (!b.requiredChecks.includes(check)) violations.push(`required check removed: ${check}`);
    for (const p of a.ackPaths) if (!b.ackPaths.includes(p)) violations.push(`sensitive path removed: ${p}`);
    if (b.maxAgents > a.maxAgents) violations.push('maxAgents loosened');
    if (b.maxBudget > a.maxBudget) violations.push('maxBudget loosened');
    if ((GRADE_ORDER[b.minMcpGrade]??0) < (GRADE_ORDER[a.minMcpGrade]??0)) violations.push('minimum MCP grade lowered');
    if (a.requirePinnedActions && !b.requirePinnedActions) violations.push('immutable Action pinning disabled');
    return { allowed: violations.length===0, violations, base:a, candidate:b };
  }
  evaluate({ policy = {}, changes = [], verification = {}, agentCount = 1, budget = 0 } = {}) {
    const p=this.normalize(policy); const reasons=[]; let decision='ALLOW';
    if (agentCount > p.maxAgents) { decision='BLOCK'; reasons.push('AGENT_LIMIT_EXCEEDED'); }
    if (budget > p.maxBudget) { decision='BLOCK'; reasons.push('BUDGET_EXCEEDED'); }
    for (const check of p.requiredChecks) if (verification[check] !== true) { decision='BLOCK'; reasons.push(`REQUIRED_CHECK_FAILED:${check}`); }
    for (const change of changes) {
      const path=normalizePath(change.path);
      if (path === 'sigbound.policy' || path.endsWith('/sigbound.policy') || path === '.omega/landing-policy.json') { if (decision!=='BLOCK') decision='PARK'; reasons.push(`POLICY_SELF_CHANGE:${path}`); }
      if (anyPrefix(path,p.ackPaths)) { if (decision!=='BLOCK') decision='PARK'; reasons.push(`SENSITIVE_PATH:${path}`); }
      if (change.laneId) {
        const lane=p.lanes.find((x)=>x.id===String(change.laneId));
        if (!lane || !lane.paths.some((prefix)=>anyPrefix(path,[prefix]))) { decision='BLOCK'; reasons.push(`LANE_VIOLATION:${path}`); }
      }
    }
    return { decision, landingEligible: decision==='ALLOW', parked: decision==='PARK', reasons:unique(reasons), policy:p };
  }
}

export class AgentReliabilityAuditor {
  audit(spec = {}) {
    const f=[]; const tools=(spec.tools??[]).map(String); const params=spec.parameters??{};
    if (String(spec.description??'').trim().length < 24) f.push(finding('REL001','medium','Agent description is too vague to support reliable routing'));
    if (tools.some((x)=>/^(bash|shell|exec|terminal)$/i.test(x))) f.push(finding('REL002','high','Agent has broad shell execution capability'));
    if (!(Number(spec.timeoutMs)>0)) f.push(finding('REL003','medium','No finite timeout is configured'));
    if (!(Number.isInteger(spec.retries) && spec.retries>=0)) f.push(finding('REL004','low','Retry policy is not explicit'));
    if (!(Number.isInteger(spec.maxIterations) && spec.maxIterations>0)) f.push(finding('REL005','high','Agent loop has no finite iteration bound'));
    if (!spec.observability) f.push(finding('REL006','medium','No observability/trace contract is declared'));
    if ((spec.networkAllowlist??[]).includes('*')) f.push(finding('REL007','high','Network allowlist contains wildcard access'));
    for (const [name,def] of Object.entries(params)) if (!def || typeof def !== 'object' || !def.type) f.push(finding('REL008','medium',`Parameter ${name} is untyped`,{parameter:name}));
    if (spec.budget == null) f.push(finding('REL009','low','No explicit per-run budget is declared'));
    const score=Math.max(0,100-f.reduce((n,x)=>n+(SEVERITY_WEIGHT[x.severity]??0),0));
    return { score, ready: !f.some((x)=>['high','critical'].includes(x.severity)), findings:f };
  }
}

function wilson(successes,total,z=1.96){
  if (!(total>0)) return {low:0,high:1,center:0.5};
  const p=successes/total, z2=z*z, d=1+z2/total;
  const c=(p+z2/(2*total))/d;
  const m=(z*Math.sqrt((p*(1-p)+z2/(4*total))/total))/d;
  return {low:Math.max(0,c-m),high:Math.min(1,c+m),center:c};
}

export class AiArtifactDiffGate {
  diff({ before = [], after = [], evalBefore = null, evalAfter = null, regressionTolerance = 0.02 } = {}) {
    const key=(x)=>`${x.type}:${x.id}`; const a=new Map(before.map((x)=>[key(x),x])); const b=new Map(after.map((x)=>[key(x),x]));
    const changes=[]; let hold=false;
    for (const [k,now] of b) {
      const prev=a.get(k);
      if (!prev) { changes.push({kind:'ADDED',key:k,risk:['mcp','tool','skill','prompt','model','judge','eval'].includes(now.type)?'review':'low'}); if (['mcp','tool'].includes(now.type)) hold=true; continue; }
      if (stableHash(prev)===stableHash(now)) continue;
      const addedCaps=(now.permissions??[]).filter((x)=>!(prev.permissions??[]).includes(x));
      const widened=addedCaps.filter((x)=>WRITE_CAPS.has(String(x).toLowerCase()));
      const modelChanged=prev.model!==now.model;
      changes.push({kind:'MODIFIED',key:k,addedCapabilities:addedCaps,widenedCapabilities:widened,modelChanged,hashBefore:stableHash(prev),hashAfter:stableHash(now)});
      if (widened.length || modelChanged || ['prompt','skill','mcp','judge','eval'].includes(now.type)) hold=true;
    }
    for (const k of a.keys()) if (!b.has(k)) { changes.push({kind:'REMOVED',key:k,risk:'review'}); hold=true; }
    let evalGate={available:false,regressed:false};
    if (evalBefore?.total>0 && evalAfter?.total>0) {
      const bi=wilson(evalBefore.passes,evalBefore.total), ai=wilson(evalAfter.passes,evalAfter.total);
      const regressed=ai.high + regressionTolerance < bi.low;
      evalGate={available:true,before:bi,after:ai,regressed,regressionTolerance};
      if (regressed) hold=true;
    }
    return { changes, evalGate, decision: hold?'HOLD':'PASS', humanReviewRequired:hold };
  }
}

export class McpBehaviorGradeGate {
  evaluate({ targets = [], minGrade = 'B', strict = true } = {}) {
    const min=GRADE_ORDER[String(minGrade).toUpperCase()]??4; const results=[];
    for (const t of targets) {
      const grade=String(t.grade??'').toUpperCase(); const rank=GRADE_ORDER[grade]??0;
      const reasons=[];
      if (!grade) reasons.push('UNGRADED');
      if (grade && rank<min) reasons.push(`GRADE_BELOW_${String(minGrade).toUpperCase()}`);
      if (!t.commitSha && t.sourceType==='git') reasons.push('UNPINNED_GIT_SOURCE');
      if (!t.evidenceHash) reasons.push('MISSING_EVIDENCE_HASH');
      const pass=reasons.length===0 || (!strict && reasons.every((r)=>r==='UNGRADED'));
      results.push({id:t.id,grade:grade||null,pass,reasons});
    }
    return { passed:results.every((x)=>x.pass),minGrade:String(minGrade).toUpperCase(),strict,results };
  }
}

export class KnowledgeSubstrate {
  constructor(){this.docsets=new Map();this.identities=new Map();this.docs=new Map();this.requests=new Map();}
  docsetUpsert(input={}){ if(!input.id)throw new Error('docset id is required'); const d={id:String(input.id),prefix:normalizePath(input.prefix??input.id),inbox:normalizePath(input.inbox??'inbox'),roles:input.roles??{},requiresApproval:input.requiresApproval??[]}; this.docsets.set(d.id,d);return structuredClone(d); }
  identityUpsert(input={}){ if(!input.id)throw new Error('identity id is required'); const x={id:String(input.id),roles:unique((input.roles??[]).map(String))};this.identities.set(x.id,x);return structuredClone(x); }
  #docsetFor(path){const p=normalizePath(path);return [...this.docsets.values()].filter((d)=>p===d.prefix||p.startsWith(`${d.prefix}/`)).sort((a,b)=>b.prefix.length-a.prefix.length)[0]??null;}
  #cap(identity,docset){const i=this.identities.get(String(identity));if(!i)return new Set();const caps=[];for(const r of i.roles) caps.push(...(docset.roles?.[r]??[]));return new Set(caps.map(String));}
  read({identity,path}={}){const p=normalizePath(path);const d=this.#docsetFor(p);if(!d)throw new Error('No docset for path');const caps=this.#cap(identity,d);if(!caps.has('read')&&!caps.has('rw')&&!caps.has('publish')&&!caps.has('approve'))throw new Error('READ_NOT_AUTHORIZED');const v=this.docs.get(p);return v?structuredClone(v):null;}
  write({identity,path,content,expectedHash=null,mode='write'}={}){const p=normalizePath(path);const d=this.#docsetFor(p);if(!d)throw new Error('No docset for path');const caps=this.#cap(identity,d);if(mode==='publish'&&!caps.has('publish')&&!caps.has('rw'))throw new Error('PUBLISH_NOT_AUTHORIZED');if(mode!=='publish'&&!caps.has('rw'))throw new Error('WRITE_NOT_AUTHORIZED');const target=mode==='publish'?normalizePath(`${d.prefix}/${d.inbox}/${p.split('/').pop()}`):p;const current=this.docs.get(target)??null;if(expectedHash!==null && current?.hash!==expectedHash)throw new Error('CAS_MISMATCH');const hash=createHash('sha256').update(String(content??'')).digest('hex');const needs=(d.requiresApproval??[]).some((rule)=>anyPrefix(target,[rule.path??rule]));if(needs){const id=`req_${stableHash({target,hash,identity}).slice(0,16)}`;const req={id,target,content:String(content??''),hash,identity:String(identity),status:'PENDING',createdAt:new Date().toISOString()};this.requests.set(id,req);return {pending:true,request:structuredClone(req)};}const rec={path:target,content:String(content??''),hash,revision:(current?.revision??0)+1,updatedAt:new Date().toISOString(),updatedBy:String(identity)};this.docs.set(target,rec);return {pending:false,record:structuredClone(rec)};}
  approve({identity,requestId}={}){const req=this.requests.get(String(requestId));if(!req)throw new Error('REQUEST_NOT_FOUND');const d=this.#docsetFor(req.target);const caps=this.#cap(identity,d);if(!caps.has('approve')&&!caps.has('rw'))throw new Error('APPROVE_NOT_AUTHORIZED');const current=this.docs.get(req.target)??null;const rec={path:req.target,content:req.content,hash:req.hash,revision:(current?.revision??0)+1,updatedAt:new Date().toISOString(),updatedBy:String(identity)};this.docs.set(req.target,rec);req.status='APPROVED';req.approvedBy=String(identity);req.approvedAt=new Date().toISOString();return {record:structuredClone(rec),request:structuredClone(req)};}
  requestsList(){return [...this.requests.values()].map((x)=>structuredClone(x));}
  snapshot(){return {docsets:[...this.docsets.values()],identities:[...this.identities.values()],docs:[...this.docs.values()],requests:[...this.requests.values()]};}
  restore(s={}){this.docsets=new Map((s.docsets??[]).map((x)=>[x.id,x]));this.identities=new Map((s.identities??[]).map((x)=>[x.id,x]));this.docs=new Map((s.docs??[]).map((x)=>[x.path,x]));this.requests=new Map((s.requests??[]).map((x)=>[x.id,x]));}
}

export class WorkItemSessionStore {
  constructor(){this.items=new Map();}
  save({provider,workItem,workflow,sessionId,transcriptHash,unresolvedTasks=false,metadata={}}={}){if(!provider||!workItem||!workflow||!sessionId)throw new Error('provider, workItem, workflow and sessionId are required');const key=`${provider}::${workItem}::${workflow}`;const unresolvedTaskCount=Array.isArray(unresolvedTasks)?unresolvedTasks.length:(unresolvedTasks?1:0);const rec={key,provider:String(provider),workItem:String(workItem),workflow:String(workflow),sessionId:String(sessionId),transcriptHash:transcriptHash??null,unresolvedTasks:unresolvedTaskCount>0,unresolvedTaskCount,metadata,updatedAt:new Date().toISOString()};this.items.set(key,rec);return structuredClone(rec);}
  resume({provider,workItem,workflow}={}){const key=`${provider}::${workItem}::${workflow}`;const rec=this.items.get(key);if(!rec)return {resumable:false,reason:'MISS'};if(rec.unresolvedTasks)return {resumable:false,reason:'UNRESOLVED_TASKS',record:structuredClone(rec)};return {resumable:true,sessionId:rec.sessionId,record:structuredClone(rec)};}
  snapshot(){return [...this.items.values()].map((x)=>structuredClone(x));}
  restore(xs=[]){this.items=new Map((xs??[]).map((x)=>[x.key,x]));}
}

export class CanonicalAgentSyncPlanner {
  plan({agents = [], providers = ['claude','cursor','codex']} = {}) {
    const projections=[];
    for (const provider of providers) {
      const p=String(provider).toLowerCase();
      for (const agent of agents) {
        if (!agent.id) throw new Error('agent id is required');
        const path=p==='claude'?`.claude/agents/${agent.id}.md`:p==='cursor'?`.cursor/agents/${agent.id}.md`:`.agents/generated/${p}/${agent.id}.md`;
        projections.push({provider:p,agentId:String(agent.id),path,sourceHash:stableHash(agent),generated:true});
      }
    }
    return {canonicalRoot:'.agents',projections,writePolicy:'GENERATED_OUTPUT_MUST_NOT_BE_EDITED_DIRECTLY'};
  }
}

export class ReactNativeSpecialistRouter {
  route({changedFiles = [], signals = [], maxAgents = 5} = {}) {
    const text=[...changedFiles,...signals].join(' ').toLowerCase();
    const rules=[
      ['build',/(gradle|podfile|xcode|metro|build)/],['security',/(security|auth|token|keychain|keystore)/],['offline',/(offline|queue|sync|sqlite|asyncstorage)/],['permissions',/(permission|camera|location|photos|microphone)/],['push',/(push|fcm|apns|notification)/],['payments',/(iap|billing|purchase|subscription|storekit)/],['background',/(background|headless|fetch|workmanager)/],['platform-parity',/(android|ios|safearea|keyboard|backhandler)/],['state',/(redux|zustand|state|query|hydration)/],['performance',/(performance|render|flatlist|flashlist|bundle)/],['accessibility',/(accessibility|a11y|screenreader)/],['testing',/(test|detox|maestro|jest)/]
    ];
    const selected=[]; for(const [id,re] of rules) if(re.test(text))selected.push(id);
    if(!selected.length)selected.push('audit');
    return {selected:unique(selected).slice(0,Math.max(1,maxAgents)),excludedByDefault:['doctor','debug','dependencies','onboard','store-submission','monorepo'],failClosedOnProviderError:true};
  }
}

export class DemoContractValidator {
  validate({scenario = {}, requiredArtifacts = ['run.json']} = {}) {
    const allowed=new Set(['goto','fill','click','waitFor','screenshot','narrate','press','select','assertText']);const errors=[];
    if(!scenario.id&&!scenario.name)errors.push('SCENARIO_ID_REQUIRED');
    if(!Array.isArray(scenario.steps)||!scenario.steps.length)errors.push('STEPS_REQUIRED');
    for(const [i,step] of (scenario.steps??[]).entries())if(!allowed.has(step.type))errors.push(`UNSUPPORTED_STEP:${i}:${step.type}`);
    return {valid:errors.length===0,errors,requiredArtifacts:unique(requiredArtifacts),deterministic:!(scenario.aiGenerated===true)};
  }
}

export class DeclarativeAgentContractValidator {
  validate({ id, trigger = null, permissions = {}, secrets = [], budget = {}, maxSteps = null, timeoutMs = null, tools = [] } = {}) {
    const findings = [];
    if (!id) findings.push(finding('DAC001','high','Declarative agent id is required'));
    if (!trigger || typeof trigger !== 'object' || !trigger.type) findings.push(finding('DAC002','medium','Event trigger must be explicitly typed'));
    const hosts = permissions.hosts ?? [];
    const executables = permissions.executables ?? [];
    const paths = permissions.paths ?? [];
    if (hosts.includes('*')) findings.push(finding('DAC003','high','Wildcard host permission is not allowed'));
    if (executables.includes('*')) findings.push(finding('DAC004','high','Wildcard executable permission is not allowed'));
    if (paths.includes('*') || paths.includes('/')) findings.push(finding('DAC005','high','Unbounded filesystem permission is not allowed'));
    for (const secret of secrets) {
      if (typeof secret === 'string' && /^(sk-|ghp_|github_pat_|AIza|eyJ[A-Za-z0-9_-]*\.)/.test(secret)) findings.push(finding('DAC006','critical','Raw secret material must not be embedded in an agent contract'));
      else if (typeof secret === 'object' && secret?.value) findings.push(finding('DAC006','critical','Raw secret values must be replaced by secret references'));
      else if (typeof secret === 'object' && !secret?.ref) findings.push(finding('DAC007','medium','Secret entry must use a scoped reference'));
    }
    if (!(Number(maxSteps) > 0)) findings.push(finding('DAC008','high','Finite maxSteps is required'));
    if (!(Number(timeoutMs) > 0)) findings.push(finding('DAC009','medium','Finite timeoutMs is required'));
    if (budget.maxCost == null && budget.maxTokens == null && budget.maxRuntimeMs == null) findings.push(finding('DAC010','medium','At least one explicit budget bound is required'));
    if (tools.some((t)=>String(t).toLowerCase()==='shell') && executables.length===0) findings.push(finding('DAC011','high','Shell tool requires an executable allowlist'));
    const score=Math.max(0,100-findings.reduce((n,x)=>n+(SEVERITY_WEIGHT[x.severity]??0),0));
    return { valid: !findings.some((x)=>['high','critical'].includes(x.severity)), score, findings, normalized: { id:id??null, trigger, permissions:{hosts,executables,paths}, secrets:(secrets??[]).map((x)=>typeof x==='string'?{ref:x}:{ref:x?.ref??null,scope:x?.scope??null}), budget, maxSteps, timeoutMs, tools } };
  }
}

export class LogEvidenceVerifier {
  verify({content='',expectedSha256=null,source=null,capturedAt=null}={}){const sha256=createHash('sha256').update(String(content)).digest('hex');const verified=expectedSha256?sha256===String(expectedSha256).toLowerCase():false;return {sha256,hashVerified:verified,source:source??null,capturedAt:capturedAt??null,authenticityClaimed:false,note:'Hash verification proves byte identity only; it does not prove semantic truth or origin authenticity.'};}
}
