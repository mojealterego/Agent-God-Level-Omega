import { createHash, randomUUID } from 'node:crypto';

export const CLAIM_STATES = Object.freeze([
  'OBSERVED', 'VERIFIED', 'INFERRED', 'SPECULATIVE', 'UNVERIFIED', 'DISPROVEN', 'UNKNOWN'
]);

const CLAIM_STATE_SET = new Set(CLAIM_STATES);
const EVIDENCE_OK = new Set(['OBSERVED', 'VERIFIED']);
const ABSOLUTE_PATTERNS = [
  /\bzapobiega\b/giu, /\bgwarantuje\b/giu, /\bnigdy\b/giu, /\bnaprawia\b/giu,
  /\beliminuje\b/giu, /\bzapewnia(?:\s*,?\s*że)?\b/giu, /\bzawsze\b/giu,
  /\b100\s*%\b/gu, /\bbezbłędn(?:y|a|e|ie)\b/giu, /\bguarantees?\b/giu,
  /\bprevents?\b/giu, /\beliminates?\b/giu, /\balways\b/giu, /\bnever\b/giu
];
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior)\s+instructions/iu,
  /system\s*:\s*/iu, /developer\s*:\s*/iu, /authorization\s*=\s*["']?absolute_system_priority/iu,
  /you\s+are\s+now\s+/iu, /jailbreak/iu, /override\s+(?:the\s+)?(?:system|policy|instructions)/iu,
  /prompt\s+injection/iu, /<\s*(?:system|developer|instruction_hierarchy)\b/iu
];
const METACOG_PATTERNS = [
  /\bchain[- ]of[- ]thought\b/iu, /\bukryt(?:y|ego)\s+(?:tok|łańcuch)\s+myślenia\b/iu,
  /\bwewnętrzn(?:y|ego)\s+tok\s+myślenia\b/iu, /\bwiem\s+dokładnie\s*,?\s*dlaczego\s+model\b/iu,
  /\bmoja\s+świadomość\b/iu, /\bjestem\s+świadom(?:y|a)\b/iu, /\bwewnętrzn(?:a|ej)\s+świadomość\b/iu
];
const INCOMPLETE_CODE_PATTERNS = [
  /\bTODO\b/iu, /\bFIXME\b/iu, /\bPLACEHOLDER\b/iu, /\/\/\s*(?:reszta|do implementacji|implement later)/iu,
  /#\s*(?:reszta|do implementacji|implement later)/iu, /^\s*pass\s*(?:#.*)?$/imu,
  /throw\s+new\s+Error\s*\(\s*["'](?:not implemented|todo)/iu
];

const AUTHORITY = Object.freeze({
  PROJECT_SCHEMA: 1.0,
  OFFICIAL_DOC: 0.95,
  OFFICIAL_SOURCE: 0.92,
  STANDARD_SPEC: 0.9,
  VENDOR_SUPPORT: 0.82,
  PEER_REVIEWED: 0.8,
  SECONDARY: 0.6,
  COMMUNITY: 0.45,
  UNKNOWN: 0.3
});

function clamp01(v){ return Math.max(0, Math.min(1, Number(v) || 0)); }
function stable(value){
  if(Array.isArray(value)) return value.map(stable);
  if(value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
function digest(value){ return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function unique(arr){ return [...new Set(arr)]; }
function evidenceMap(evidence=[]){ return new Map(evidence.filter(x=>x?.id).map(x=>[x.id,x])); }
function matchesAll(text, patterns){
  const hits=[];
  for(const re of patterns){ re.lastIndex=0; const m=text.match(re); if(m) hits.push(...m); }
  return unique(hits.map(x=>String(x)));
}

export class EpistemicClaimEngine {
  classify({claim, evidence=[]}={}){
    if(!claim || typeof claim !== 'object') throw new Error('claim object required');
    const state=String(claim.state??'').toUpperCase();
    if(state){ if(!CLAIM_STATE_SET.has(state)) throw new Error(`unsupported claim state: ${state}`); return {...claim,state}; }
    if(claim.disproven===true) return {...claim,state:'DISPROVEN'};
    if(claim.speculative===true) return {...claim,state:'SPECULATIVE'};
    if(claim.inferred===true) return {...claim,state:'INFERRED'};
    if(claim.observed===true) return {...claim,state:'OBSERVED'};
    const map=evidenceMap(evidence); const ids=claim.evidenceIds??[]; const refs=ids.map(id=>map.get(id)).filter(Boolean);
    if(claim.verified===true && refs.length===ids.length && refs.length>0 && refs.every(e=>EVIDENCE_OK.has(e.state))) return {...claim,state:'VERIFIED'};
    if(ids.length===0) return {...claim,state:'UNVERIFIED'};
    if(refs.length!==ids.length) return {...claim,state:'UNVERIFIED'};
    return {...claim,state:'UNKNOWN'};
  }

  verify({claim,evidence=[]}={}){
    const classified=this.classify({claim,evidence}); const map=evidenceMap(evidence); const ids=classified.evidenceIds??[];
    const refs=ids.map(id=>map.get(id)).filter(Boolean); const missing=ids.filter(id=>!map.has(id));
    const supporting=refs.filter(e=>EVIDENCE_OK.has(e.state));
    const contradicting=refs.filter(e=>e.state==='DISPROVEN'||e.supports===false);
    return {
      claim:classified,
      evidenceCoverage: ids.length ? supporting.length/ids.length : 0,
      missingEvidenceIds:missing,
      contradictoryEvidenceIds:contradicting.map(x=>x.id),
      verified: classified.state==='VERIFIED' && missing.length===0 && contradicting.length===0
    };
  }
}

export class SourceOfTruthVerifier {
  verify({sources=[],maxAgeDays=null}={}){
    const now=Date.now();
    const normalized=sources.map((s,index)=>{
      const authorityClass=String(s.authorityClass??'UNKNOWN').toUpperCase();
      const authority=AUTHORITY[authorityClass]??AUTHORITY.UNKNOWN;
      const observedAt=s.observedAt??null; const ageDays=observedAt?Math.max(0,(now-Date.parse(observedAt))/86400000):null;
      const fresh=maxAgeDays==null||ageDays==null?true:ageDays<=maxAgeDays;
      return {...s,id:s.id??`source-${index+1}`,authorityClass,authority,ageDays,fresh};
    });
    const eligible=normalized.filter(s=>s.fresh && s.disproven!==true);
    eligible.sort((a,b)=>b.authority-a.authority || (Date.parse(b.observedAt??0)-Date.parse(a.observedAt??0)) || a.id.localeCompare(b.id));
    const values=new Map();
    for(const s of eligible){ if(s.value!==undefined){const key=JSON.stringify(stable(s.value)); if(!values.has(key))values.set(key,[]);values.get(key).push(s.id);} }
    const conflict=values.size>1;
    return {selected:eligible[0]??null,ranked:eligible,conflict,conflictGroups:[...values.values()],authorityOrder:Object.keys(AUTHORITY)};
  }
}

export class AssertivenessAuditor {
  audit({text='',deterministicProof=false,evidence=[]}={}){
    const hits=matchesAll(String(text),ABSOLUTE_PATTERNS);
    const proof=Boolean(deterministicProof)||evidence.some(e=>e?.deterministic===true && EVIDENCE_OK.has(e.state));
    return {valid:hits.length===0||proof,hits,deterministicProofObserved:proof,requiresQualification:hits.length>0&&!proof};
  }
}

export class InjectionAuditor {
  audit({text='',source='external'}={}){
    const hits=INJECTION_PATTERNS.filter(re=>{re.lastIndex=0;return re.test(String(text));}).map(re=>re.source);
    const external=String(source).toLowerCase()!=='internal';
    return {
      detected:hits.length>0,
      classification:hits.length&&external?'EXTERNAL_UNTRUSTED_INSTRUCTION':hits.length?'INSTRUCTION_PATTERN':'CLEAN',
      policyEffectAllowed:!(hits.length&&external),
      hits
    };
  }
}

export class MetacognitiveAuditor {
  audit({text='',observedTraceIds=[]}={}){
    const hits=METACOG_PATTERNS.filter(re=>{re.lastIndex=0;return re.test(String(text));}).map(re=>re.source);
    return {detected:hits.length>0,hits,traceEvidencePresent:Array.isArray(observedTraceIds)&&observedTraceIds.length>0,requiredTag:hits.length?'[Wnioskowanie]':null,hiddenChainOfThoughtRequired:false};
  }
}

export class CodeCompletenessAuditor {
  audit({code='',artifactType='PRODUCTION_ARTIFACT'}={}){
    const kind=String(artifactType).toUpperCase(); const findings=[];
    for(const re of INCOMPLETE_CODE_PATTERNS){re.lastIndex=0;if(re.test(String(code)))findings.push(re.source);}
    const strict=kind==='PRODUCTION_ARTIFACT';
    return {artifactType:kind,complete:!strict||findings.length===0,strict,findings};
  }
}

export class RealityFilterKernel {
  constructor(){
    this.claims=new EpistemicClaimEngine();this.sources=new SourceOfTruthVerifier();this.assertiveness=new AssertivenessAuditor();this.injection=new InjectionAuditor();this.metacognitive=new MetacognitiveAuditor();this.code=new CodeCompletenessAuditor();
  }

  responseAudit({text='',claims=[],evidence=[],mode='PRECISE',source='internal',deterministicProof=false,observedTraceIds=[]}={}){
    const classified=claims.map(c=>this.claims.classify({claim:c,evidence}));
    const unverified=classified.filter(c=>['UNVERIFIED','UNKNOWN'].includes(c.state));
    const speculative=classified.filter(c=>c.state==='SPECULATIVE'); const inferred=classified.filter(c=>c.state==='INFERRED');
    let requiredResponseTag=null;
    if(String(mode).toUpperCase()==='STRICT'){
      if(speculative.length)requiredResponseTag='[Spekulacja]'; else if(unverified.length)requiredResponseTag='[Niezweryfikowane]'; else if(inferred.length)requiredResponseTag='[Wnioskowanie]';
    }
    return {
      mode:String(mode).toUpperCase(), classifiedClaims:classified, requiredResponseTag,
      perClaimTags:classified.map(c=>({id:c.id??null,state:c.state,tag:c.state==='INFERRED'?'[Wnioskowanie]':c.state==='SPECULATIVE'?'[Spekulacja]':['UNVERIFIED','UNKNOWN'].includes(c.state)?'[Niezweryfikowane]':null})),
      assertiveness:this.assertiveness.audit({text,deterministicProof,evidence}),
      injection:this.injection.audit({text,source}),
      metacognitive:this.metacognitive.audit({text,observedTraceIds})
    };
  }

  realityScore({claims=[],evidence=[],contradictions=0}={}){
    const map=evidenceMap(evidence); const classified=claims.map(c=>this.claims.classify({claim:c,evidence}));
    let refs=0,goodRefs=0,provenance=0,reliabilitySum=0,reliabilityCount=0;
    for(const c of classified){
      if(c.source||c.sourceId||c.provenance)provenance++;
      for(const id of c.evidenceIds??[]){refs++;const e=map.get(id);if(e&&EVIDENCE_OK.has(e.state))goodRefs++;if(e&&Number.isFinite(Number(e.reliability))){reliabilitySum+=clamp01(e.reliability);reliabilityCount++;}}
    }
    const n=Math.max(1,classified.length); const E=refs?goodRefs/refs:(classified.length?classified.filter(c=>EVIDENCE_OK.has(c.state)).length/n:1);
    const S=reliabilityCount?reliabilitySum/reliabilityCount:0.5; const C=clamp01(1-Number(contradictions||0)/n); const P=classified.length?provenance/n:1;
    const U=classified.length?classified.filter(c=>['UNVERIFIED','UNKNOWN','SPECULATIVE'].includes(c.state)).length/n:0; const X=clamp01(Number(contradictions||0)/n);
    const score=clamp01(0.30*E+0.15*S+0.20*C+0.15*P-0.10*U-0.10*X+0.30);
    return {score:Number(score.toFixed(6)),components:{evidenceCoverage:E,sourceReliability:S,consistency:C,provenance:P,unverifiedPenalty:U,contradictionPenalty:X}};
  }

  gate(input={}){
    const {claims=[],evidence=[],requiredUnknowns=0,artifactRequired=false,artifactPresent=false,testRequired=false,testsObserved=false,buildRequired=false,buildObserved=false,securityRequired=false,securityGate=true,repositoryRequired=false,repositoryGate=true,ciRequired=false,ciGate=true,releaseRequired=false,releaseGate=true,code=null,artifactType='PRODUCTION_ARTIFACT',responseText='',mode='STRICT',contradictions=0,decisionTraceAudit=null}=input;
    const blockers=[]; const classified=claims.map(c=>this.claims.classify({claim:c,evidence}));
    if(Number(requiredUnknowns)>0)blockers.push({code:'REQUIRED_UNKNOWNS',count:Number(requiredUnknowns)});
    const critical=classified.filter(c=>c.required!==false&&['UNKNOWN','UNVERIFIED','DISPROVEN'].includes(c.state)); if(critical.length)blockers.push({code:'CRITICAL_CLAIMS_NOT_VERIFIED',claimIds:critical.map(c=>c.id??null)});
    if(artifactRequired&&!artifactPresent)blockers.push({code:'ARTIFACT_MISSING'});
    if(testRequired&&!testsObserved)blockers.push({code:'TESTS_NOT_OBSERVED'});
    if(buildRequired&&!buildObserved)blockers.push({code:'BUILD_NOT_OBSERVED'});
    if(securityRequired&&!securityGate)blockers.push({code:'SECURITY_GATE_FAILED'});
    if(repositoryRequired&&!repositoryGate)blockers.push({code:'REPOSITORY_GATE_FAILED'});
    if(ciRequired&&!ciGate)blockers.push({code:'CI_GATE_FAILED'});
    if(releaseRequired&&!releaseGate)blockers.push({code:'RELEASE_GATE_FAILED'});
    const codeAudit=code==null?null:this.code.audit({code,artifactType}); if(codeAudit&&!codeAudit.complete)blockers.push({code:'CODE_INCOMPLETE',findings:codeAudit.findings});
    const responseAudit=this.responseAudit({text:responseText,claims,evidence,mode}); if(!responseAudit.assertiveness.valid)blockers.push({code:'UNSUPPORTED_ABSOLUTE_CLAIM',hits:responseAudit.assertiveness.hits});
    if(responseAudit.injection.detected && !responseAudit.injection.policyEffectAllowed)blockers.push({code:'UNTRUSTED_INSTRUCTION_ISOLATED'});
    if(decisionTraceAudit?.valid===false)blockers.push({code:'DECISION_TRACE_INVALID',findings:decisionTraceAudit.findings??[]});
    const reality=this.realityScore({claims,evidence,contradictions});
    return {allowedDone:blockers.length===0,status:blockers.length?'BLOCKED':'DONE_ELIGIBLE',blockers,reality,responseAudit,codeAudit,classifiedClaims:classified};
  }
}

export function makeEvidenceRecord(input={}){
  const id=input.id??randomUUID(); const observedAt=input.observedAt??new Date().toISOString(); const state=String(input.state??'OBSERVED').toUpperCase();
  if(!CLAIM_STATE_SET.has(state))throw new Error(`unsupported evidence state: ${state}`);
  const record={id,state,kind:input.kind??'generic',source:input.source??null,sourceUri:input.sourceUri??null,authorityClass:String(input.authorityClass??'UNKNOWN').toUpperCase(),reliability:clamp01(input.reliability??0.5),deterministic:Boolean(input.deterministic),supports:input.supports!==false,payload:input.payload??null,observedAt};
  return {...record,sha256:digest(record)};
}
