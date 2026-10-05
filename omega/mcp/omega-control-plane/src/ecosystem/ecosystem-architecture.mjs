import { createHash, randomUUID } from 'node:crypto';

function words(value) {
  return new Set(String(value ?? '').toLowerCase().replace(/[^a-z0-9_+.-]+/g, ' ').split(/\s+/).filter(x => x.length > 1));
}
function jaccard(a,b){ const u=new Set([...a,...b]); if(!u.size)return 1; let i=0; for(const x of a)if(b.has(x))i++; return i/u.size; }
function stable(value){ if(Array.isArray(value)) return value.map(stable); if(value&&typeof value==='object'){return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));} return value; }
export function sha256(value){ return createHash('sha256').update(typeof value==='string'?value:JSON.stringify(stable(value))).digest('hex'); }
function finite(n, fallback=0){ const x=Number(n); return Number.isFinite(x)?x:fallback; }
function avg(xs){ return xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0; }

export class SkillCatalog {
  constructor({duplicateThreshold=0.82}={}){ this.duplicateThreshold=duplicateThreshold; this.skills=new Map(); }
  upsert(skill){
    if(!skill?.name||!skill?.description) throw new Error('skill name and description are required');
    const id=skill.id??`${skill.source??'local'}:${skill.name}`;
    const tools=[...(skill.tools??[])].map(String).sort();
    const tags=[...(skill.tags??[])].map(String).sort();
    const tokenSet=words([skill.name,skill.description,tools.join(' '),tags.join(' ')].join(' '));
    const record={id,name:String(skill.name),description:String(skill.description),source:skill.source??'local',version:skill.version??null,verified:Boolean(skill.verified),tests:finite(skill.tests),tools,tags,location:skill.location??null,instructions:skill.instructions??null,tokenSet:[...tokenSet],fingerprint:sha256({name:String(skill.name).toLowerCase(),tools,tags,description:String(skill.description).toLowerCase().replace(/\s+/g,' ').trim()})};
    this.skills.set(id,record); return {...record,tokenSet:undefined};
  }
  progressiveCatalog(){ return [...this.skills.values()].map(s=>({id:s.id,name:s.name,description:s.description,location:s.location})); }
  activate(id){ const s=this.skills.get(id); if(!s)throw new Error(`Unknown skill ${id}`); return {...s,tokenSet:undefined}; }
  deduplicate({threshold=this.duplicateThreshold}={}){
    const all=[...this.skills.values()]; const parent=new Map(all.map(x=>[x.id,x.id]));
    const find=x=>{let p=parent.get(x);while(p!==parent.get(p)){parent.set(p,parent.get(parent.get(p)));p=parent.get(p);}return p;};
    const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent.set(b,a);};
    for(let i=0;i<all.length;i++)for(let j=i+1;j<all.length;j++){
      const a=all[i],b=all[j]; const sim=jaccard(new Set(a.tokenSet),new Set(b.tokenSet));
      const toolSame=a.tools.length>0&&JSON.stringify(a.tools)===JSON.stringify(b.tools);
      if(a.fingerprint===b.fingerprint||sim>=threshold||(toolSame&&sim>=Math.max(.55,threshold-.2))) union(a.id,b.id);
    }
    const groups=new Map(); for(const s of all){const r=find(s.id);if(!groups.has(r))groups.set(r,[]);groups.get(r).push(s);}
    const score=s=>(s.verified?1000:0)+Math.min(500,s.tests)+Math.min(100,s.tools.length*5)+(s.version?20:0)+(s.source==='official'?50:0);
    return [...groups.values()].map(group=>{const ranked=[...group].sort((a,b)=>score(b)-score(a)||a.id.localeCompare(b.id));return {canonical:ranked[0].id,aliases:ranked.slice(1).map(x=>x.id),size:ranked.length};}).sort((a,b)=>b.size-a.size||a.canonical.localeCompare(b.canonical));
  }
}

export class SkillEvalHarness {
  compare({skillId,trials=[],minLift=0,toolAssertions=[]}={}){
    if(!skillId||!Array.isArray(trials)||!trials.length)throw new Error('skillId and trials are required');
    const norm=trials.map((t,i)=>{
      const base=finite(t.without?.score), skilled=finite(t.with?.score); const calls=t.with?.toolCalls??[];
      const assertions=toolAssertions.map(a=>({tool:a.tool,ok:a.required===false?!calls.includes(a.tool):calls.includes(a.tool)}));
      return {id:t.id??String(i),baseline:base,withSkill:skilled,lift:skilled-base,latencyDeltaMs:finite(t.with?.latencyMs)-finite(t.without?.latencyMs),assertions};
    });
    const meanLift=avg(norm.map(x=>x.lift)); const assertionPass=norm.every(x=>x.assertions.every(a=>a.ok));
    return {skillId,trials:norm,meanLift,winRate:norm.filter(x=>x.lift>0).length/norm.length,assertionPass,passed:meanLift>=minLift&&assertionPass};
  }
}

const privateHosts=[/^localhost$/i,/^127\./,/^0\./,/^10\./,/^192\.168\./,/^169\.254\./,/^172\.(1[6-9]|2\d|3[01])\./,/^\[?::1\]?$/];
export class McpSecurityGateway {
  constructor({allowPrivate=false,reservedTools=[]}={}){this.allowPrivate=allowPrivate;this.reserved=new Set(reservedTools);this.servers=new Map();}
  #validateUrl(url){ if(!url)return; const u=new URL(url); if(!['https:','http:'].includes(u.protocol))throw new Error('Unsupported MCP URL scheme'); if(!this.allowPrivate&&privateHosts.some(r=>r.test(u.hostname)))throw new Error('Private/loopback MCP URL blocked'); }
  register(server){
    if(!server?.id)throw new Error('server id required'); if(server.url)this.#validateUrl(server.url);
    const tools=[...(server.tools??[])].map(t=>typeof t==='string'?t:t.name); const existing=new Map();
    for(const s of this.servers.values())for(const t of s.tools)existing.set(t,s.id);
    for(const t of tools){if(this.reserved.has(t))throw new Error(`Reserved tool collision: ${t}`);if(existing.has(t)&&existing.get(t)!==server.id)throw new Error(`Tool collision: ${t}`);}
    const rec={id:server.id,url:server.url??null,transport:server.transport??'streamable-http',tools,authRef:server.authRef??null,digest:server.digest??null,enabled:server.enabled!==false,namespace:server.namespace??server.id,rateLimitPerMinute:Math.max(1,finite(server.rateLimitPerMinute,60)),registeredAt:new Date().toISOString()};
    this.servers.set(rec.id,rec); return rec;
  }
  list(){return [...this.servers.values()];}
  route(tool){for(const s of this.servers.values())if(s.enabled&&s.tools.includes(tool))return {serverId:s.id,namespace:s.namespace,tool};return null;}
  scanSecrets(value){const text=JSON.stringify(value??{});const patterns=[/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,/\bsk-[A-Za-z0-9_-]{20,}\b/g,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,/\bAKIA[0-9A-Z]{16}\b/g];const hits=[];for(const p of patterns){const m=text.match(p);if(m)hits.push(...m.map(x=>({type:'SECRET_LIKE',preview:`${x.slice(0,4)}…${x.slice(-4)}`})));}return {blocked:hits.length>0,hits};}
  authorize({tool,arguments:args,allowedTools=null}={}){const route=this.route(tool);if(!route)return {allowed:false,reason:'TOOL_NOT_ROUTABLE'};if(allowedTools&&!allowedTools.includes(tool))return {allowed:false,reason:'POLICY_DENIED'};const secrets=this.scanSecrets(args);if(secrets.blocked)return {allowed:false,reason:'SECRET_DETECTED',secrets};return {allowed:true,route};}
}

export class A2ARouter {
  constructor(){this.agents=new Map();}
  register(card){if(!card?.id)throw new Error('agent id required');const r={id:card.id,capabilities:[...(card.capabilities??[])],endpoint:card.endpoint??null,trust:Math.max(0,Math.min(1,finite(card.trust,.5))),latencyMs:Math.max(0,finite(card.latencyMs,1000)),cost:Math.max(0,finite(card.cost,0)),healthy:card.healthy!==false};this.agents.set(r.id,r);return r;}
  route({capability,minTrust=0,weights={trust:.5,latency:.3,cost:.2}}={}){const xs=[...this.agents.values()].filter(a=>a.healthy&&a.capabilities.includes(capability)&&a.trust>=minTrust);if(!xs.length)return null;const maxLat=Math.max(1,...xs.map(x=>x.latencyMs)),maxCost=Math.max(1,...xs.map(x=>x.cost));return xs.map(a=>({...a,score:(weights.trust??.5)*a.trust+(weights.latency??.3)*(1-a.latencyMs/maxLat)+(weights.cost??.2)*(1-a.cost/maxCost)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))[0];}
}

export class StatefulAgentKernel {
  constructor(){this.sessions=new Map();}
  create({id=randomUUID(),agent,state={},goal=null}={}){if(!agent)throw new Error('agent required');const s={id,agent,state,status:'RUNNING',goal,revision:0,checkpoints:[],handoffs:[],createdAt:new Date().toISOString()};this.sessions.set(id,s);return structuredClone(s);}
  checkpoint(id,label='checkpoint'){const s=this.#get(id);const cp={revision:s.revision,label,state:structuredClone(s.state),at:new Date().toISOString(),hash:sha256(s.state)};s.checkpoints.push(cp);return cp;}
  patch(id,patch){const s=this.#get(id);if(s.status!=='RUNNING')throw new Error('session is not running');s.state={...s.state,...structuredClone(patch)};s.revision++;return structuredClone(s);}
  pause(id){const s=this.#get(id);s.status='PAUSED';return this.checkpoint(id,'pause');}
  resume(id){const s=this.#get(id);s.status='RUNNING';return structuredClone(s);}
  handoff(id,{to,task,context={}}){const s=this.#get(id);const h={from:s.agent,to,task,context,revision:s.revision,at:new Date().toISOString()};s.handoffs.push(h);return h;}
  get(id){return structuredClone(this.#get(id));}
  #get(id){const s=this.sessions.get(id);if(!s)throw new Error(`Unknown session ${id}`);return s;}
}

export class SandboxWarmPool {
  constructor({maxPool=8}={}){this.maxPool=maxPool;this.templates=new Map();this.instances=new Map();}
  template(t){if(!t?.id)throw new Error('template id required');const r={id:t.id,image:t.image??null,runtimeClass:t.runtimeClass??'gvisor',network:t.network??'none',cpu:finite(t.cpu,1),memoryMb:finite(t.memoryMb,1024),ttlMs:Math.max(1000,finite(t.ttlMs,3600000)),readOnlyRoot:t.readOnlyRoot!==false};this.templates.set(r.id,r);return r;}
  prewarm(templateId,count=1){const t=this.templates.get(templateId);if(!t)throw new Error('unknown template');const created=[];for(let i=0;i<Math.min(count,this.maxPool-this.instances.size);i++){const id=randomUUID();const x={id,templateId,status:'WARM',claimedBy:null,createdAt:Date.now(),expiresAt:Date.now()+t.ttlMs};this.instances.set(id,x);created.push({...x});}return created;}
  claim(templateId,owner){const x=[...this.instances.values()].find(x=>x.templateId===templateId&&x.status==='WARM'&&x.expiresAt>Date.now());if(!x)return null;x.status='CLAIMED';x.claimedBy=owner;return {...x};}
  release(id){const x=this.instances.get(id);if(!x)throw new Error('unknown sandbox');x.status='WARM';x.claimedBy=null;return {...x};}
  reap(now=Date.now()){const removed=[];for(const [id,x] of this.instances)if(x.expiresAt<=now&&x.status!=='CLAIMED'){this.instances.delete(id);removed.push(id);}return removed;}
}

export class TraceStore {
  constructor(){this.traces=new Map();}
  startTrace({id=randomUUID(),name,attributes={}}={}){if(!name)throw new Error('trace name required');const t={id,name,attributes,startedAt:Date.now(),endedAt:null,spans:[]};this.traces.set(id,t);return {id};}
  span(traceId,{name,kind='internal',start=Date.now(),end=Date.now(),attributes={},status='OK',cost=0,tokens=0}={}){const t=this.traces.get(traceId);if(!t)throw new Error('unknown trace');const s={id:randomUUID(),name,kind,start,end,durationMs:Math.max(0,end-start),attributes,status,cost:finite(cost),tokens:finite(tokens)};t.spans.push(s);return s;}
  end(traceId,end=Date.now()){const t=this.traces.get(traceId);if(!t)throw new Error('unknown trace');t.endedAt=end;return this.summary(traceId);}
  summary(traceId){const t=this.traces.get(traceId);if(!t)throw new Error('unknown trace');return {id:t.id,name:t.name,durationMs:(t.endedAt??Date.now())-t.startedAt,spanCount:t.spans.length,errorCount:t.spans.filter(s=>s.status!=='OK').length,cost:t.spans.reduce((a,s)=>a+s.cost,0),tokens:t.spans.reduce((a,s)=>a+s.tokens,0),toolSuccessRate:(()=>{const xs=t.spans.filter(s=>s.kind==='tool');return xs.length?xs.filter(s=>s.status==='OK').length/xs.length:null;})()};}
}

export class CodeGraph {
  constructor(){this.nodes=new Map();this.out=new Map();this.in=new Map();}
  addSymbol(s){if(!s?.id)throw new Error('symbol id required');const r={id:s.id,kind:s.kind??'symbol',file:s.file??null,exported:Boolean(s.exported),metadata:s.metadata??{}};this.nodes.set(r.id,r);if(!this.out.has(r.id))this.out.set(r.id,new Set());if(!this.in.has(r.id))this.in.set(r.id,new Set());return r;}
  link(from,to,type='calls'){if(!this.nodes.has(from)||!this.nodes.has(to))throw new Error('unknown symbol');this.out.get(from).add(`${type}\0${to}`);this.in.get(to).add(`${type}\0${from}`);return {from,to,type};}
  impact(id,{depth=3}={}){if(!this.nodes.has(id))throw new Error('unknown symbol');const seen=new Set([id]),q=[[id,0]],affected=[];while(q.length){const [cur,d]=q.shift();if(d>=depth)continue;for(const edge of this.in.get(cur)??[]){const [,from]=edge.split('\0');if(!seen.has(from)){seen.add(from);affected.push({id:from,distance:d+1});q.push([from,d+1]);}}}return affected;}
  dead(){return [...this.nodes.values()].filter(n=>!n.exported&&(this.in.get(n.id)?.size??0)===0).map(n=>n.id);}
}

export class AndroidFeedbackLoop {
  constructor(){this.sessions=new Map();}
  open({id=randomUUID(),platform='android',app=null}={}){const s={id,platform,app,epoch:0,elements:new Map(),evidence:[],openedAt:new Date().toISOString()};this.sessions.set(id,s);return {id,platform,app};}
  snapshot(id,elements=[]){const s=this.#get(id);s.epoch++;s.elements=new Map(elements.map((e,i)=>[`@e${i+1}`,{...e,ref:`@e${i+1}`,epoch:s.epoch}]));return {session:id,epoch:s.epoch,elements:[...s.elements.values()]};}
  act(id,{ref,action,value=null,epoch}={}){const s=this.#get(id);if(epoch!==s.epoch)throw new Error('STALE_SNAPSHOT_EPOCH');const e=s.elements.get(ref);if(!e||e.epoch!==epoch)throw new Error('STALE_OR_UNKNOWN_REF');const record={ref,action,value,epoch,at:new Date().toISOString()};s.evidence.push(record);return record;}
  evidence(id,item){const s=this.#get(id);const r={...item,at:item.at??new Date().toISOString()};s.evidence.push(r);return r;}
  get(id){const s=this.#get(id);return {id:s.id,platform:s.platform,app:s.app,epoch:s.epoch,evidence:[...s.evidence]};}
  #get(id){const s=this.sessions.get(id);if(!s)throw new Error('unknown device session');return s;}
}

function validateSimple(schema,value,path='$'){
  if(!schema)return [];
  const errs=[]; const type=schema.type;
  if(type==='object'){if(value===null||typeof value!=='object'||Array.isArray(value))return [`${path} must be object`];for(const k of schema.required??[])if(!(k in value))errs.push(`${path}.${k} is required`);for(const [k,s] of Object.entries(schema.properties??{}))if(k in value)errs.push(...validateSimple(s,value[k],`${path}.${k}`));}
  else if(type==='string'&&typeof value!=='string')errs.push(`${path} must be string`);
  else if(type==='number'&&typeof value!=='number')errs.push(`${path} must be number`);
  else if(type==='integer'&&!Number.isInteger(value))errs.push(`${path} must be integer`);
  else if(type==='boolean'&&typeof value!=='boolean')errs.push(`${path} must be boolean`);
  else if(type==='array'){if(!Array.isArray(value))errs.push(`${path} must be array`);else if(schema.items)for(let i=0;i<value.length;i++)errs.push(...validateSimple(schema.items,value[i],`${path}[${i}]`));}
  return errs;
}
export class AutomationPieceRegistry {
  constructor(){this.pieces=new Map();}
  register(piece){if(!piece?.id||!piece?.inputSchema)throw new Error('piece id and inputSchema required');const r={id:piece.id,version:piece.version??'0.0.0',inputSchema:piece.inputSchema,outputSchema:piece.outputSchema??null,triggers:[...(piece.triggers??[])],actions:[...(piece.actions??[])],mcpExposed:Boolean(piece.mcpExposed),requiresApproval:Boolean(piece.requiresApproval)};this.pieces.set(r.id,r);return r;}
  validate(id,input){const p=this.pieces.get(id);if(!p)throw new Error('unknown piece');const errors=validateSimple(p.inputSchema,input);return {valid:errors.length===0,errors};}
  plan(id,{action,input,approved=false}={}){const p=this.pieces.get(id);if(!p)throw new Error('unknown piece');if(!p.actions.includes(action))return {executable:false,reason:'UNKNOWN_ACTION'};const v=this.validate(id,input);if(!v.valid)return {executable:false,reason:'INVALID_INPUT',errors:v.errors};if(p.requiresApproval&&!approved)return {executable:false,reason:'APPROVAL_REQUIRED'};return {executable:true,piece:id,version:p.version,action,input,mcpExposed:p.mcpExposed};}
}
