const DEFAULT_ENDPOINT='https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL='gemini-3.8-flash';
const DEFAULT_DEEP_RESEARCH_AGENT='deep-research-preview-04-2026';
const DEFAULT_API_REVISION='2026-05-20';

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function cleanId(id){const value=String(id??'').trim();if(!/^[-_a-zA-Z0-9.]+$/.test(value))throw new Error('invalid interaction id');return value;}
function redactErrorText(text){return String(text??'').replace(/AIza[0-9A-Za-z_-]{20,}/g,'[REDACTED_API_KEY]');}

export function extractGeminiText(interaction){
  if(typeof interaction?.output_text==='string'&&interaction.output_text.trim())return interaction.output_text;
  const out=[];
  for(const step of interaction?.steps??[]){
    if(step?.type!=='model_output'&&step?.type!=='agent_output')continue;
    for(const item of step?.content??[])if(item?.type==='text'&&typeof item.text==='string')out.push(item.text);
  }
  return out.join('\n\n').trim();
}

export class GeminiInteractionsClient {
  constructor({apiKey=null,apiKeyEnv='GEMINI_API_KEY',env=process.env,endpoint=DEFAULT_ENDPOINT,fetchImpl=globalThis.fetch,apiRevision=DEFAULT_API_REVISION}={}){
    this.apiKeyEnv=apiKeyEnv;this.env=env;this.apiKey=apiKey??env?.[apiKeyEnv]??null;this.endpoint=String(endpoint).replace(/\/$/,'');this.fetchImpl=fetchImpl;this.apiRevision=apiRevision;
  }
  configuration(){return {configured:Boolean(this.apiKey&&this.fetchImpl),apiKeyEnv:this.apiKeyEnv,endpoint:this.endpoint,apiRevision:this.apiRevision,secretStored:false,apiKeyPresent:Boolean(this.apiKey)};}
  async doctor({probe=false}={}){
    const c=this.configuration();if(!c.apiKeyPresent)return {...c,ready:false,reason:'GEMINI_API_KEY_UNAVAILABLE'};if(typeof this.fetchImpl!=='function')return {...c,ready:false,reason:'FETCH_UNAVAILABLE'};if(!probe)return {...c,ready:true,probe:false};
    try{const res=await this.fetchImpl(`${this.endpoint}/interactions/__omega_probe__`,{method:'GET',headers:this.#headers(true)});const reachable=res.status!==0;const authRejected=[401,403].includes(res.status);return {...c,ready:reachable&&!authRejected,probe:true,httpStatus:res.status,reachable,authRejected};}
    catch(e){return {...c,ready:false,probe:true,reason:redactErrorText(e?.message??e)};}
  }
  async createModel({input,model=DEFAULT_MODEL,previousInteractionId=null,background=false,store=true,tools=null,systemInstruction=null,generationConfig=null}={}){
    if(!input)throw new Error('input is required');const body={model,input,background:Boolean(background),store:Boolean(store)};
    if(previousInteractionId)body.previous_interaction_id=cleanId(previousInteractionId);if(Array.isArray(tools)&&tools.length)body.tools=tools;if(systemInstruction)body.system_instruction=systemInstruction;if(generationConfig)body.generation_config=generationConfig;
    return await this.#request('/interactions',{method:'POST',body});
  }
  async createDeepResearch({input,agent=DEFAULT_DEEP_RESEARCH_AGENT,thinkingSummaries='auto',visualization='auto',collaborativePlanning=false,tools=null,background=true}={}){
    if(!input)throw new Error('input is required');const body={input,agent,agent_config:{type:'deep-research',thinking_summaries:thinkingSummaries,visualization,collaborative_planning:Boolean(collaborativePlanning)},background:Boolean(background)};if(Array.isArray(tools)&&tools.length)body.tools=tools;return await this.#request('/interactions',{method:'POST',body});
  }
  async get(id){return await this.#request(`/interactions/${encodeURIComponent(cleanId(id))}`,{method:'GET',apiRevision:true});}
  async continue({previousInteractionId,input,model=DEFAULT_MODEL,background=false,store=true,tools=null,systemInstruction=null,generationConfig=null}={}){return await this.createModel({input,model,previousInteractionId,background,store,tools,systemInstruction,generationConfig});}
  async awaitCompletion(id,{pollIntervalMs=5000,maxPolls=240,maxWaitMs=20*60*1000}={}){
    const started=Date.now();let polls=0;let current=await this.get(id);
    while(current?.status==='in_progress'||current?.status==='queued'){
      if(++polls>=maxPolls||Date.now()-started>=maxWaitMs)return {completed:false,terminal:false,reason:'POLL_BUDGET_EXHAUSTED',interaction:current,polls,elapsedMs:Date.now()-started};
      if(pollIntervalMs>0)await sleep(pollIntervalMs);current=await this.get(id);
    }
    return {completed:current?.status==='completed',terminal:true,interaction:current,text:extractGeminiText(current),polls,elapsedMs:Date.now()-started};
  }
  async #request(path,{method='GET',body=null,apiRevision=false}={}){
    if(!this.apiKey)throw Object.assign(new Error(`Gemini API key unavailable in ${this.apiKeyEnv}`),{code:'GEMINI_API_KEY_UNAVAILABLE'});if(typeof this.fetchImpl!=='function')throw Object.assign(new Error('fetch unavailable'),{code:'FETCH_UNAVAILABLE'});
    const res=await this.fetchImpl(`${this.endpoint}${path}`,{method,headers:this.#headers(apiRevision),body:body==null?undefined:JSON.stringify(body)});const raw=await res.text();let data=null;try{data=raw?JSON.parse(raw):{};}catch{data={raw:redactErrorText(raw)}}
    if(!res.ok){const message=redactErrorText(data?.error?.message??data?.message??raw??`HTTP ${res.status}`);const err=Object.assign(new Error(`Gemini API ${res.status}: ${message}`),{code:'GEMINI_API_ERROR',status:res.status,response:data});throw err;}return data;
  }
  #headers(apiRevision=false){const h={'Content-Type':'application/json','x-goog-api-key':this.apiKey};if(apiRevision)h['Api-Revision']=this.apiRevision;return h;}
}

export const GEMINI_DEFAULTS=Object.freeze({endpoint:DEFAULT_ENDPOINT,model:DEFAULT_MODEL,deepResearchAgent:DEFAULT_DEEP_RESEARCH_AGENT,apiRevision:DEFAULT_API_REVISION});
