import { dirname, join, resolve } from 'node:path';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { RealityFilterKernel, makeEvidenceRecord } from './reality-filter-architecture.mjs';

async function readJson(path,fallback){try{return JSON.parse(await readFile(path,'utf8'));}catch(e){if(e?.code==='ENOENT')return structuredClone(fallback);throw e;}}
async function writeJsonAtomic(path,value){await mkdir(dirname(path),{recursive:true});const tmp=`${path}.${process.pid}.${Date.now()}.tmp`;await writeFile(tmp,JSON.stringify(value,null,2)+'\n','utf8');await rename(tmp,path);}

export class RealityFilterRuntime {
  constructor({root,traceAuditor=null,securityGate=null}={}){
    if(!root)throw new Error('root is required');this.root=resolve(root);this.kernel=new RealityFilterKernel();this.traceAuditor=traceAuditor;this.securityGate=securityGate;this.statePath=join(this.root,'.omega','reality-filter-v20.json');this.evidence=new Map();this.corrections=[];
  }

  async action({action,payload={}}={}){
    switch(action){
      case 'evidence-add': return await this.#evidenceAdd(payload);
      case 'evidence-get': return this.evidence.get(payload.id)??null;
      case 'evidence-list': return [...this.evidence.values()];
      case 'claim-classify': return this.kernel.claims.classify({claim:payload.claim??payload,evidence:payload.evidence??[...this.evidence.values()]});
      case 'claim-verify': return this.kernel.claims.verify({claim:payload.claim??payload,evidence:payload.evidence??[...this.evidence.values()]});
      case 'source-verify': return this.kernel.sources.verify(payload);
      case 'assertiveness-audit': return this.kernel.assertiveness.audit(payload);
      case 'injection-audit': return this.kernel.injection.audit(payload);
      case 'metacognitive-audit': return this.kernel.metacognitive.audit(payload);
      case 'code-completeness-audit': return this.kernel.code.audit(payload);
      case 'response-audit': return this.kernel.responseAudit({...payload,evidence:payload.evidence??[...this.evidence.values()]});
      case 'reality-score': return this.kernel.realityScore({...payload,evidence:payload.evidence??[...this.evidence.values()]});
      case 'reality-gate': return await this.#gate(payload);
      case 'correction-record': return await this.#correction(payload);
      case 'correction-list': return structuredClone(this.corrections);
      case 'state-save': return await this.#save();
      case 'state-load': return await this.#load();
      default: throw new Error(`Unsupported Reality Filter action: ${action}`);
    }
  }

  async #evidenceAdd(payload){const record=makeEvidenceRecord(payload);this.evidence.set(record.id,record);return record;}

  async #gate(payload){
    const evidence=payload.evidence??[...this.evidence.values()]; let decisionTraceAudit=null; let kratosGate=true; let kratosResult=null;
    if(payload.decisionTrace && this.traceAuditor){
      const normalizedEvidence=evidence.map(e=>({...e,state:e.state==='VERIFIED'?'OBSERVED':e.state}));
      decisionTraceAudit=await this.traceAuditor({...payload.decisionTrace,evidence:normalizedEvidence});
    }
    if(payload.securityRequired && this.securityGate){
      try{kratosResult=await this.securityGate(payload.securityPayload??{});kratosGate=kratosResult?.allowed!==false && kratosResult?.rejected!==true && kratosResult?.safe!==false;}
      catch(e){kratosGate=false;kratosResult={error:String(e?.message??e)};}
    }
    const result=this.kernel.gate({...payload,evidence,decisionTraceAudit,securityGate:payload.securityRequired?kratosGate:(payload.securityGate??true)});
    return {...result,decisionTraceAudit,kratos:{checked:Boolean(payload.securityRequired&&this.securityGate),passed:kratosGate,result:kratosResult},finalGate:'THOR_RELEASE_GATE'};
  }

  async #correction({statement,reason,previousClaimId=null,replacement=null}={}){
    if(!statement||!reason)throw new Error('statement and reason are required');const record={id:`corr-${this.corrections.length+1}`,statement,reason,previousClaimId,replacement,createdAt:new Date().toISOString(),template:'Korekta: Wcześniej przedstawiłem niezweryfikowane twierdzenie. Było ono nieprawidłowe i powinno zostać oznaczone.'};this.corrections.push(record);await this.#save();return record;
  }

  async #save(){const state={version:20,evidence:[...this.evidence.values()],corrections:this.corrections,savedAt:new Date().toISOString()};await writeJsonAtomic(this.statePath,state);return {saved:true,path:this.statePath,evidence:state.evidence.length,corrections:state.corrections.length};}
  async #load(){const state=await readJson(this.statePath,null);if(!state)return {loaded:false,reason:'STATE_NOT_FOUND'};this.evidence=new Map((state.evidence??[]).map(x=>[x.id,x]));this.corrections=state.corrections??[];return {loaded:true,version:state.version??20,evidence:this.evidence.size,corrections:this.corrections.length};}
}
