import { randomUUID } from 'node:crypto';

const PROVIDERS = new Set(['GEMINI','CHATGPT','GITHUB','GITLAB','GOOGLE','MICROSOFT','OTHER']);
const TRANSPORTS = new Set(['ENV_API_KEY','HOST_PROFILE','GH_CONFIG_DIR','ENV_TOKEN','HOST_CONNECTOR','MCP_FEDERATION']);
const SECRETISH = /(api[_-]?key|token|password|passwd|secret|private[_-]?key|authorization)/i;

function clone(v){ return structuredClone(v); }
function norm(v){ return String(v ?? '').trim(); }
function capset(v){ return [...new Set((v ?? []).map(x => String(x).trim()).filter(Boolean))].sort(); }
function nowIso(){ return new Date().toISOString(); }
function ensureNoRawSecrets(obj){
  for(const [k,v] of Object.entries(obj ?? {})){
    if(SECRETISH.test(k) && !/(Ref|Env|EnvRef|Reference)$/i.test(k) && v != null && String(v).trim()!==''){
      const e = new Error(`raw secret field rejected: ${k}`); e.code='RAW_SECRET_REJECTED'; throw e;
    }
  }
}

export class AccountTunnelBroker {
  constructor({env=process.env}={}){ this.env=env; this.accounts=new Map(); this.sessions=new Map(); this.affinity=new Map(); }

  register(input={}){
    ensureNoRawSecrets(input);
    const id=norm(input.id); if(!id) throw new Error('account id required');
    const provider=norm(input.provider).toUpperCase(); if(!PROVIDERS.has(provider)) throw new Error(`unsupported provider ${provider}`);
    const transport=norm(input.transport).toUpperCase(); if(!TRANSPORTS.has(transport)) throw new Error(`unsupported transport ${transport}`);
    const previous=this.accounts.get(id);
    const account={
      id, provider, transport,
      accountLabel:norm(input.accountLabel)||id,
      authorized:Boolean(input.authorized), active:input.active!==false,
      capabilities:capset(input.capabilities), scopes:capset(input.scopes),
      secretEnvRef:norm(input.secretEnvRef)||null,
      profileRef:norm(input.profileRef)||null,
      connectorRef:norm(input.connectorRef)||null,
      priority:Number.isFinite(Number(input.priority))?Number(input.priority):50,
      maxConcurrency:Math.max(1,Math.min(32,Number(input.maxConcurrency)||1)),
      rateLimitPerMinute:Math.max(1,Number(input.rateLimitPerMinute)||60),
      health:input.health??previous?.health??'UNKNOWN',
      inFlight:previous?.inFlight??0,
      successes:previous?.successes??0,
      failures:previous?.failures??0,
      cooldownUntil:previous?.cooldownUntil??null,
      metadata:{...(previous?.metadata??{}),...(input.metadata??{})},
      updatedAt:nowIso()
    };
    this.accounts.set(id,account); return this.view(id);
  }


  bootstrap({provider,count=1,idPrefix=null,transport=null,secretEnvPrefix=null,profilePrefix=null,capabilities=[],authorized=null}={}){
    const p=String(provider??'').toUpperCase(); if(!PROVIDERS.has(p))throw new Error('valid provider required'); const n=Math.max(1,Math.min(100,Number(count)||1));
    const defaultTransport=p==='GEMINI'?'ENV_API_KEY':p==='CHATGPT'?'HOST_PROFILE':p==='GITHUB'?'GH_CONFIG_DIR':'HOST_CONNECTOR';
    const t=String(transport??defaultTransport).toUpperCase(); const created=[];
    for(let i=1;i<=n;i++){
      const id=`${idPrefix??p.toLowerCase()}-${i}`; const secretEnvRef=secretEnvPrefix?`${secretEnvPrefix}${i}`:null; const profileRef=profilePrefix?`${profilePrefix}${i}`:(p==='CHATGPT'?`profile-${i}`:null);
      const isAuthorized=authorized==null?(secretEnvRef?Boolean(this.env?.[secretEnvRef]):false):Boolean(authorized);
      created.push(this.register({id,provider:p,transport:t,secretEnvRef,profileRef,authorized:isAuthorized,capabilities}));
    }
    return {provider:p,count:created.length,created};
  }

  view(id){ const a=this.accounts.get(id); if(!a) throw new Error('unknown account'); const { ...safe }=a; return clone(safe); }
  list({provider=null}={}){ return [...this.accounts.values()].filter(a=>!provider||a.provider===String(provider).toUpperCase()).map(a=>this.view(a.id)); }

  setHealth(id,{health='HEALTHY',cooldownMs=0}={}){
    const a=this.accounts.get(id); if(!a) throw new Error('unknown account');
    a.health=String(health).toUpperCase(); a.cooldownUntil=cooldownMs>0?new Date(Date.now()+cooldownMs).toISOString():null; a.updatedAt=nowIso(); return this.view(id);
  }

  record(id,{ok=true}={}){ const a=this.accounts.get(id); if(!a) throw new Error('unknown account'); if(ok)a.successes++;else a.failures++; a.health=ok?'HEALTHY':(a.failures>=3?'DEGRADED':'UNKNOWN');a.updatedAt=nowIso();return this.view(id); }

  route({provider,capability=null,affinityKey=null,exclude=[]}={}){
    const p=String(provider??'').toUpperCase(); if(!PROVIDERS.has(p)) throw new Error('valid provider required');
    const excluded=new Set(exclude??[]); const now=Date.now();
    if(affinityKey){ const prior=this.affinity.get(`${p}:${affinityKey}`); if(prior && !excluded.has(prior)) { const a=this.accounts.get(prior); if(a && this.#eligible(a,capability,now)) return {selected:this.view(a.id),reason:'AFFINITY'}; } }
    const candidates=[...this.accounts.values()].filter(a=>a.provider===p&&!excluded.has(a.id)&&this.#eligible(a,capability,now));
    if(!candidates.length) return {selected:null,reason:'NO_ELIGIBLE_ACCOUNT'};
    candidates.sort((a,b)=>this.#score(b)-this.#score(a)||a.id.localeCompare(b.id)); const selected=candidates[0];
    if(affinityKey)this.affinity.set(`${p}:${affinityKey}`,selected.id);
    return {selected:this.view(selected.id),reason:'SCORE',score:this.#score(selected),candidateCount:candidates.length};
  }

  acquire({provider,capability=null,affinityKey=null,accountId=null}={}){
    let account;
    if(accountId){ account=this.accounts.get(accountId); if(!account||account.provider!==String(provider).toUpperCase()||!this.#eligible(account,capability,Date.now())) return {acquired:false,reason:'ACCOUNT_UNAVAILABLE'}; }
    else { const routed=this.route({provider,capability,affinityKey}); if(!routed.selected)return {acquired:false,reason:routed.reason}; account=this.accounts.get(routed.selected.id); }
    account.inFlight++;
    const sessionId=randomUUID(); const session={sessionId,accountId:account.id,provider:account.provider,capability,affinityKey,startedAt:nowIso(),released:false}; this.sessions.set(sessionId,session);
    return {acquired:true,session:clone(session),account:this.view(account.id),auth:this.authDescriptor(account.id)};
  }

  release(sessionId,{ok=true}={}){
    const s=this.sessions.get(sessionId); if(!s) return {released:false,reason:'SESSION_NOT_FOUND'}; if(s.released)return {released:false,reason:'ALREADY_RELEASED'};
    const a=this.accounts.get(s.accountId); if(a)a.inFlight=Math.max(0,a.inFlight-1); s.released=true;s.endedAt=nowIso();this.record(s.accountId,{ok});return {released:true,session:clone(s),account:this.view(s.accountId)};
  }

  authDescriptor(id){
    const a=this.accounts.get(id); if(!a)throw new Error('unknown account');
    const secretAvailable=Boolean(a.secretEnvRef && this.env?.[a.secretEnvRef]);
    return {transport:a.transport,secretEnvRef:a.secretEnvRef,secretAvailable,profileRef:a.profileRef,connectorRef:a.connectorRef,rawSecretReturned:false};
  }

  envPatch(id){
    const a=this.accounts.get(id); if(!a)throw new Error('unknown account'); const out={};
    if(a.transport==='GH_CONFIG_DIR'&&a.profileRef)out.GH_CONFIG_DIR=a.profileRef;
    if(a.transport==='ENV_TOKEN'&&a.secretEnvRef&&this.env?.[a.secretEnvRef])out.GH_TOKEN=this.env[a.secretEnvRef];
    return out;
  }

  secretValue(id){ const a=this.accounts.get(id); if(!a)throw new Error('unknown account'); return a.secretEnvRef?this.env?.[a.secretEnvRef]??null:null; }

  restore(accounts=[]){ for(const a of accounts??[])this.register(a); return {restored:this.accounts.size}; }
  snapshot(){ return this.list(); }

  #eligible(a,capability,now){
    if(!a.active||!a.authorized)return false; if(a.inFlight>=a.maxConcurrency)return false;
    if(a.cooldownUntil&&Date.parse(a.cooldownUntil)>now)return false; if(a.health==='DOWN')return false;
    if(capability&&a.capabilities.length&&!a.capabilities.includes(capability))return false; return true;
  }
  #score(a){ const health={HEALTHY:25,UNKNOWN:5,DEGRADED:-20,DOWN:-100}[a.health]??0; const reliability=(a.successes+1)/(a.successes+a.failures+2)*20; return a.priority+health+reliability-(a.inFlight/a.maxConcurrency)*30; }
}
