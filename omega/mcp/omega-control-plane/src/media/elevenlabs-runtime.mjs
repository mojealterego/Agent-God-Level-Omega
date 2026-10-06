import { createHash } from 'node:crypto';
import { dirname, extname, resolve } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const API_BASE = 'https://api.elevenlabs.io';
const BILLABLE = new Set([
  'music-compose','dialogue-generate','sound-effect-generate','voice-isolate','voice-change','forced-align',
  'dubbing-project-create','dubbing-language-create','image-create','video-create'
]);

function cleanObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return Object.fromEntries(Object.entries(value).filter(([,v]) => v !== undefined));
}

function sha256(buffer) { return createHash('sha256').update(buffer).digest('hex'); }

export class ElevenLabsMediaRuntime {
  constructor({ root, env = process.env, fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
    if (!root) throw new Error('root is required');
    if (typeof fetchImpl !== 'function') throw new Error('fetch implementation is required');
    this.root = resolve(root);
    this.env = env;
    this.fetchImpl = fetchImpl;
    this.now = now;
  }

  async action({ action, payload = {} } = {}) {
    if (!action) throw new Error('action is required');
    if (BILLABLE.has(action)) this.#requireApproval(payload);
    switch (action) {
      case 'doctor': return this.#doctor();
      case 'capabilities': return this.#capabilities();
      case 'latency-plan': return this.#latencyPlan(payload);
      case 'speech-engine-upstream-contract': return this.#speechEngineContract();
      case 'speech-engine-create': return await this.#speechEngineCreate(payload);
      case 'speech-engine-get': return await this.#json('GET', `/v1/speech-engine/${this.#segment(payload.speechEngineId, 'speechEngineId')}`);
      case 'music-plan': return await this.#musicPlan(payload);
      case 'music-compose': return await this.#musicCompose(payload);
      case 'dialogue-generate': return await this.#dialogue(payload);
      case 'sound-effect-generate': return await this.#soundEffect(payload);
      case 'voice-isolate': return await this.#voiceIsolate(payload);
      case 'voice-change': return await this.#voiceChange(payload);
      case 'forced-align': return await this.#forcedAlign(payload);
      case 'dubbing-project-create': return await this.#dubbingProjectCreate(payload);
      case 'dubbing-project-get': return await this.#json('GET', `/v1/dubbing/project/${this.#segment(payload.projectId, 'projectId')}`);
      case 'dubbing-language-create': return await this.#dubbingLanguageCreate(payload);
      case 'dubbing-language-get': return await this.#json('GET', `/v1/dubbing/project/${this.#segment(payload.projectId,'projectId')}/language/${this.#segment(payload.languageId,'languageId')}`);
      case 'dubbing-language-download': return await this.#dubbingDownload(payload);
      case 'image-create': return await this.#generationCreate('image', payload);
      case 'image-get': return await this.#generationGet('image', payload);
      case 'image-download': return await this.#generationDownload('image', payload);
      case 'video-create': return await this.#generationCreate('video', payload);
      case 'video-get': return await this.#generationGet('video', payload);
      case 'video-download': return await this.#generationDownload('video', payload);
      default: throw new Error(`Unsupported OMEGA v24 media action: ${action}`);
    }
  }

  #doctor() {
    return {
      available: Boolean(this.env.ELEVENLABS_API_KEY),
      provider: 'ElevenLabs',
      auth: { type: 'env-ref', ref: 'ELEVENLABS_API_KEY', present: Boolean(this.env.ELEVENLABS_API_KEY) },
      apiBase: API_BASE,
      rawSecretPersisted: false,
      hostConnectorSupported: true,
      checkedAt: this.now().toISOString()
    };
  }

  #capabilities() {
    return {
      provider: 'ElevenLabs',
      authReady: Boolean(this.env.ELEVENLABS_API_KEY),
      operations: {
        speechEngine: ['create','get','upstream-contract'],
        music: ['composition-plan','compose'],
        dialogue: ['generate'],
        audio: ['sound-effects','voice-isolation','voice-change','forced-alignment'],
        dubbing: ['project-create','project-get','language-create','language-get','language-download'],
        flows: ['image-create','image-get','image-download','video-create','video-get','video-download']
      },
      billingGuard: 'approved=true required for credit-consuming operations',
      secretStorage: 'environment reference only'
    };
  }

  #latencyPlan({ mode = 'voice-agent' } = {}) {
    const plans = {
      'voice-agent': {
        transport: 'Speech Engine WebSocket + streamed LLM response',
        priorities: ['stream LLM tokens immediately','use low-latency TTS model where quality allows','cancel in-flight LLM on interruption','measure time-to-first-audio separately from model inference latency']
      },
      'tts-streaming': {
        transport: 'HTTP streaming by default; WebSocket when text and audio are generated concurrently',
        priorities: ['minimize geographic RTT','avoid oversized player buffers','measure first-byte and first-audio independently']
      }
    };
    return plans[mode] ?? { transport: 'provider-specific', priorities: ['measure end-to-end latency before tuning'] };
  }

  #speechEngineContract() {
    return {
      direction: 'ElevenLabs connects to your public WebSocket server',
      upstreamUrl: 'wss://api.elevenlabs.io/speech-engine/upstream',
      serverEvents: ['init','user_transcript','ping','close','error'],
      clientEvents: ['agent_response','pong'],
      interruption: 'server-side SDK should cancel the in-flight LLM request when the user interrupts',
      requirement: 'speech_engine.ws_url must be a publicly reachable wss:// endpoint',
      note: 'OMEGA configures and validates the contract; deployment of the public WebSocket service remains a host/runtime responsibility.'
    };
  }

  async #speechEngineCreate(payload) {
    this.#requireApproval(payload);
    const wsUrl = String(payload.wsUrl ?? '');
    if (!/^wss:\/\//i.test(wsUrl)) throw new Error('wsUrl must use wss://');
    const body = cleanObject({
      name: payload.name,
      speech_engine: { ws_url: wsUrl, request_headers: payload.requestHeaders ?? undefined },
      asr: payload.asr,
      tts: payload.tts,
      turn: payload.turn
    });
    return await this.#json('POST','/v1/speech-engine',body);
  }

  async #musicPlan(payload) {
    const prompt = this.#text(payload.prompt,'prompt',4100);
    const musicLengthMs = payload.musicLengthMs;
    if (musicLengthMs != null && (!Number.isInteger(musicLengthMs) || musicLengthMs < 3000 || musicLengthMs > 600000)) throw new Error('musicLengthMs must be 3000..600000');
    return await this.#json('POST','/v1/music/plan',cleanObject({prompt,music_length_ms:musicLengthMs,model_id:payload.modelId ?? 'music_v2_5',source_composition_plan:payload.sourceCompositionPlan}));
  }

  async #musicCompose(payload) {
    if ((payload.prompt == null) === (payload.compositionPlan == null)) throw new Error('Provide exactly one of prompt or compositionPlan');
    if (payload.prompt != null) this.#text(payload.prompt,'prompt',4100);
    if (payload.musicLengthMs != null && (!Number.isInteger(payload.musicLengthMs) || payload.musicLengthMs < 3000 || payload.musicLengthMs > 600000)) throw new Error('musicLengthMs must be 3000..600000');
    const query = new URLSearchParams();
    if (payload.outputFormat) query.set('output_format', String(payload.outputFormat));
    const body = cleanObject({
      prompt: payload.prompt,
      composition_plan: payload.compositionPlan,
      music_length_ms: payload.musicLengthMs,
      model_id: payload.modelId ?? 'music_v2_5',
      seed: payload.seed,
      force_instrumental: payload.forceInstrumental,
      store_for_inpainting: payload.storeForInpainting,
      sign_with_c2pa: payload.signWithC2pa
    });
    return await this.#binary('POST',`/v1/music${query.size ? `?${query}` : ''}`,body,payload.outputPath ?? 'artifacts/elevenlabs/music.mp3');
  }

  async #dialogue(payload) {
    if (!Array.isArray(payload.inputs) || payload.inputs.length === 0) throw new Error('inputs must be a non-empty array');
    const total = payload.inputs.reduce((sum, x) => sum + String(x?.text ?? '').length, 0);
    if (total > 2000) throw new Error('Dialogue text exceeds the reliable 2000-character request limit');
    const voices = new Set(payload.inputs.map(x=>String(x?.voiceId ?? '')));
    if (voices.has('')) throw new Error('Every dialogue input requires voiceId');
    if (voices.size > 10) throw new Error('Dialogue supports at most 10 unique voice IDs');
    const inputs = payload.inputs.map(x=>({text:this.#text(x.text,'dialogue text',2000),voice_id:String(x.voiceId)}));
    const query = new URLSearchParams();
    if (payload.outputFormat) query.set('output_format',String(payload.outputFormat));
    const body = cleanObject({inputs,model_id:payload.modelId ?? 'eleven_v3',language_code:payload.languageCode,seed:payload.seed,settings:payload.settings});
    return await this.#binary('POST',`/v1/text-to-dialogue${query.size ? `?${query}`:''}`,body,payload.outputPath ?? 'artifacts/elevenlabs/dialogue.mp3');
  }

  async #soundEffect(payload) {
    const text = this.#text(payload.text,'text',10000);
    const duration = payload.durationSeconds;
    if (duration != null && (typeof duration !== 'number' || duration < 0.1 || duration > 30)) throw new Error('durationSeconds must be 0.1..30');
    const body=cleanObject({text,duration_seconds:duration,prompt_influence:payload.promptInfluence,loop:payload.loop});
    const query=new URLSearchParams(); if(payload.outputFormat)query.set('output_format',String(payload.outputFormat));
    return await this.#binary('POST',`/v1/sound-generation${query.size?`?${query}`:''}`,body,payload.outputPath ?? 'artifacts/elevenlabs/sound-effect.mp3');
  }

  async #voiceIsolate(payload) {
    const form = new FormData();
    form.set('audio', await this.#blob(payload.inputPath));
    if (payload.fileFormat) form.set('file_format', String(payload.fileFormat));
    return await this.#binaryForm('POST','/v1/audio-isolation',form,payload.outputPath ?? 'artifacts/elevenlabs/isolated.mp3');
  }

  async #voiceChange(payload) {
    const voiceId=this.#segment(payload.voiceId,'voiceId');
    const form=new FormData(); form.set('audio',await this.#blob(payload.inputPath));
    form.set('model_id',String(payload.modelId ?? 'eleven_multilingual_sts_v2'));
    const query=new URLSearchParams(); if(payload.outputFormat)query.set('output_format',String(payload.outputFormat));
    return await this.#binaryForm('POST',`/v1/speech-to-speech/${voiceId}${query.size?`?${query}`:''}`,form,payload.outputPath ?? 'artifacts/elevenlabs/voice-changed.mp3');
  }

  async #forcedAlign(payload) {
    const text=this.#text(payload.text,'text',675000);
    const form=new FormData(); form.set('file',await this.#blob(payload.inputPath)); form.set('text',text);
    return await this.#jsonForm('POST','/v1/forced-alignment',form);
  }

  async #dubbingProjectCreate(payload) {
    if ((payload.inputPath == null) === (payload.sourceUrl == null)) throw new Error('Provide exactly one of inputPath or sourceUrl');
    const form=new FormData();
    if(payload.inputPath) form.set('file',await this.#blob(payload.inputPath));
    if(payload.sourceUrl) form.set('source_url',this.#httpsUrl(payload.sourceUrl,'sourceUrl'));
    if(payload.reference) form.set('reference',this.#text(payload.reference,'reference',500));
    if(payload.sourceLanguage) form.set('source_language',String(payload.sourceLanguage));
    form.set('model_id',String(payload.modelId ?? 'dubbing_v2'));
    if(payload.targetLanguage) form.set('target_language',String(payload.targetLanguage));
    for(const id of payload.webhookIds ?? []) form.append('webhook_ids',String(id));
    return await this.#jsonForm('POST','/v1/dubbing/project',form);
  }

  async #dubbingLanguageCreate(payload) {
    const projectId=this.#segment(payload.projectId,'projectId');
    return await this.#json('POST',`/v1/dubbing/project/${projectId}/language`,{target_language:String(payload.targetLanguage ?? '')});
  }

  async #dubbingDownload(payload) {
    const projectId=this.#segment(payload.projectId,'projectId'); const languageId=this.#segment(payload.languageId,'languageId');
    const language=await this.#json('GET',`/v1/dubbing/project/${projectId}/language/${languageId}`);
    if(language.status!=='completed') return {downloaded:false,status:language.status,projectId,languageId};
    const url=language.outputs?.lossless_audio;
    if(!url) throw new Error('Completed language target has no lossless_audio URL');
    return await this.#downloadHttps(url,payload.outputPath ?? `artifacts/elevenlabs/dub-${languageId}.wav`,{projectId,languageId});
  }

  async #generationCreate(kind,payload){
    const modelId=this.#text(payload.modelId,'modelId',200);
    const body={...payload.request,model_id:modelId};
    delete body.approved; delete body.outputPath;
    return await this.#json('POST',`/v1/flows/${kind}`,body);
  }
  async #generationGet(kind,payload){return await this.#json('GET',`/v1/flows/${kind}/${this.#segment(payload.generationId,'generationId')}`);}
  async #generationDownload(kind,payload){
    const state=await this.#generationGet(kind,payload);
    if(state.status!=='completed') return {downloaded:false,status:state.status,generationId:payload.generationId};
    if(!state.content_url) throw new Error('Completed generation has no content_url');
    const suffix=kind==='image'?'.png':'.mp4';
    return await this.#downloadHttps(state.content_url,payload.outputPath ?? `artifacts/elevenlabs/${kind}-${payload.generationId}${suffix}`,{generationId:payload.generationId,kind});
  }

  #requireApproval(payload){if(payload?.approved!==true)throw new Error('approved=true is required for credit-consuming or provider-mutating ElevenLabs operations');}
  #key(){const key=this.env.ELEVENLABS_API_KEY;if(!key)throw new Error('ELEVENLABS_API_KEY is not configured in the runtime environment');return key;}
  #segment(value,name){const s=String(value??'');if(!/^[A-Za-z0-9_.:-]{1,256}$/.test(s))throw new Error(`${name} is invalid`);return encodeURIComponent(s);}
  #text(value,name,max){const s=String(value??'');if(!s.trim())throw new Error(`${name} is required`);if(s.length>max)throw new Error(`${name} exceeds ${max} characters`);return s;}
  #httpsUrl(value,name){const u=new URL(String(value));if(u.protocol!=='https:'&&u.protocol!=='http:')throw new Error(`${name} must use http(s)`);return u.toString();}
  #path(value){const p=resolve(this.root,String(value??''));if(p!==this.root&&!p.startsWith(`${this.root}/`))throw new Error(`Path escapes workspace root: ${value}`);return p;}
  async #blob(path){const p=this.#path(path);const bytes=await readFile(p);return new Blob([bytes]);}

  async #request(method,path,{body,form=false,expect='json'}={}){
    const headers={'xi-api-key':this.#key()}; if(body!=null&&!form) headers['content-type']='application/json';
    const controller=new AbortController(); const timeout=setTimeout(()=>controller.abort(),120000);
    try{
      const res=await this.fetchImpl(`${API_BASE}${path}`,{method,headers,body:body==null?undefined:(form?body:JSON.stringify(body)),signal:controller.signal});
      if(!res.ok){const text=await res.text();throw new Error(`ElevenLabs HTTP ${res.status}: ${text.slice(0,1000)}`);}
      if(expect==='json') return await res.json();
      return Buffer.from(await res.arrayBuffer());
    } finally { clearTimeout(timeout); }
  }
  async #json(method,path,body){return await this.#request(method,path,{body,expect:'json'});}
  async #jsonForm(method,path,body){return await this.#request(method,path,{body,form:true,expect:'json'});}
  async #binary(method,path,body,outputPath){const bytes=await this.#request(method,path,{body,expect:'binary'});return await this.#save(bytes,outputPath);}
  async #binaryForm(method,path,body,outputPath){const bytes=await this.#request(method,path,{body,form:true,expect:'binary'});return await this.#save(bytes,outputPath);}
  async #downloadHttps(url,outputPath,metadata={}){
    const u=new URL(String(url));if(u.protocol!=='https:')throw new Error('Provider output URL must use https://');
    const res=await this.fetchImpl(u,{method:'GET'});if(!res.ok)throw new Error(`Output download failed: HTTP ${res.status}`);
    const bytes=Buffer.from(await res.arrayBuffer());return {...await this.#save(bytes,outputPath,res.headers?.get?.('content-type')??null),...metadata};
  }
  async #save(bytes,outputPath,contentType=null){const p=this.#path(outputPath);await mkdir(dirname(p),{recursive:true});await writeFile(p,bytes);return {saved:true,path:p,size:bytes.length,sha256:sha256(bytes),contentType,createdAt:this.now().toISOString()};}
}
