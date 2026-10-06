import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { ElevenLabsMediaRuntime } from './elevenlabs-runtime.mjs';

const API_BASE='https://api.elevenlabs.io';

export class ElevenLabsMediaRuntimeV25 {
  constructor({root,env=process.env,fetchImpl=globalThis.fetch,now=()=>new Date()}={}){
    if(!root)throw new Error('root is required');
    if(typeof fetchImpl!=='function')throw new Error('fetch implementation is required');
    this.root=resolve(root);this.env=env;this.fetchImpl=fetchImpl;this.now=now;
    this.base=new ElevenLabsMediaRuntime({root:this.root,env,fetchImpl,now});
    this.sessions=new Map();
  }

  async action({action,payload={}}={}){
    switch(action){
      case 'speech-engine-verify-jwt': return this.#verifyJwt(payload);
      case 'speech-engine-event-guard': return this.#eventGuard(payload);
      case 'speech-engine-list': return await this.#listSpeechEngines(payload);
      case 'speech-engine-update': return await this.#updateSpeechEngine(payload);
      case 'speech-engine-delete': return await this.#deleteSpeechEngine(payload);
      case 'music-compose-detailed': return await this.#musicDetailed(payload);
      case 'dialogue-with-timestamps': return await this.#dialogueWithTimestamps(payload);
      case 'sound-effect-generate': this.#validateSfx(payload); return await this.base.action({action,payload});
      case 'forced-align': await this.#validateAlignmentFile(payload); return await this.base.action({action,payload});
      case 'dubbing-project-create':
      case 'dubbing-language-create':
        this.#billingAck(payload);
        return await this.base.action({action,payload});
      case 'capabilities': {
        const r=await this.base.action({action,payload});
        return {...r,operations:{...r.operations,
          speechEngine:['list','create','get','update','delete','verify-jwt','event-guard','upstream-contract'],
          music:['composition-plan','compose','compose-detailed'],
          dialogue:['generate','with-timestamps']
        },hardeningVersion:25};
      }
      case 'speech-engine-upstream-contract': {
        const r=await this.base.action({action,payload});
        return {...r,
          authentication:{type:'JWT-HS256',issuer:'https://api.elevenlabs.io/convai/speech-engine',subject:'convai_speech_engine_upstream',secretDerivation:'SHA-256(ELEVENLABS_API_KEY)',maxClockLeewaySeconds:60},
          interruption:'Cancel in-flight LLM work on a newer user_transcript event_id and discard stale agent_response chunks.'
        };
      }
      default: return await this.base.action({action,payload});
    }
  }

  #verifyJwt({token,leewaySeconds=60}={}){
    const raw=String(token??'').replace(/^Bearer\s+/i,'');
    const parts=raw.split('.');
    if(parts.length!==3)throw new Error('Speech Engine JWT must have three segments');
    if(!Number.isFinite(leewaySeconds)||leewaySeconds<0||leewaySeconds>60)throw new Error('leewaySeconds must be 0..60');
    let header,claims;
    try{
      header=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
      claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
    }catch{throw new Error('Speech Engine JWT payload is invalid');}
    if(header.alg!=='HS256')throw new Error('Speech Engine JWT alg must be HS256');
    const secret=createHash('sha256').update(this.#key()).digest();
    const expected=createHmac('sha256',secret).update(parts[0]+'.'+parts[1]).digest();
    const supplied=Buffer.from(parts[2],'base64url');
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new Error('Speech Engine JWT signature is invalid');
    const issuer='https://api.elevenlabs.io/convai/speech-engine';
    const subject='convai_speech_engine_upstream';
    if(claims.iss!==issuer)throw new Error('Speech Engine JWT issuer is invalid');
    if(claims.sub!==subject)throw new Error('Speech Engine JWT subject is invalid');
    const now=Math.floor(this.now().getTime()/1000),leeway=Math.floor(leewaySeconds);
    if(!Number.isFinite(claims.exp)||claims.exp+leeway<now)throw new Error('Speech Engine JWT is expired');
    if(claims.nbf!=null&&(!Number.isFinite(claims.nbf)||claims.nbf-leeway>now))throw new Error('Speech Engine JWT is not active yet');
    return {valid:true,algorithm:'HS256',issuer:claims.iss,subject:claims.sub,expiresAt:new Date(claims.exp*1000).toISOString(),notBefore:claims.nbf==null?null:new Date(claims.nbf*1000).toISOString(),rawTokenPersisted:false};
  }

  #eventGuard({sessionId,event}={}){
    const sid=this.#text(sessionId,'sessionId',256);
    if(!event||typeof event!=='object')throw new Error('event is required');
    const type=String(event.type??'');
    if(type==='ping')return {accepted:true,reply:{type:'pong',event_id:event.event_id??null}};
    if(type==='close'){this.sessions.delete(sid);return {accepted:true,closed:true};}
    const id=Number(event.event_id);
    if(!Number.isInteger(id)||id<0)throw new Error('event_id must be a non-negative integer');
    const latest=this.sessions.get(sid)??-1;
    if(type==='user_transcript'){
      if(id<=latest)return {accepted:false,reason:'STALE_TRANSCRIPT_EVENT_ID',eventId:id,latestEventId:latest,cancelInFlight:false};
      this.sessions.set(sid,id);
      return {accepted:true,eventId:id,previousEventId:latest,cancelInFlight:latest>=0};
    }
    if(type==='agent_response'){
      if(id!==latest)return {accepted:false,reason:'STALE_EVENT_ID',eventId:id,latestEventId:latest,discard:true};
      return {accepted:true,eventId:id,latestEventId:latest,discard:false};
    }
    return {accepted:true,eventId:id,latestEventId:latest};
  }

  async #listSpeechEngines({pageSize=30,cursor}={}){
    if(!Number.isInteger(pageSize)||pageSize<1||pageSize>100)throw new Error('pageSize must be 1..100');
    const q=new URLSearchParams({page_size:String(pageSize)});if(cursor!=null)q.set('cursor',String(cursor));
    return await this.#json('GET','/v1/speech-engine?'+q);
  }

  async #updateSpeechEngine(p){
    this.#approved(p);
    const id=this.#segment(p.speechEngineId,'speechEngineId');
    if(p.wsUrl!=null&&!/^wss:\/\//i.test(String(p.wsUrl)))throw new Error('wsUrl must use wss://');
    const body=this.#clean({name:p.name,speech_engine:p.wsUrl==null&&p.requestHeaders==null?undefined:{ws_url:p.wsUrl,request_headers:p.requestHeaders},asr:p.asr,tts:p.tts,turn:p.turn});
    return await this.#json('PATCH','/v1/speech-engine/'+id,body);
  }

  async #deleteSpeechEngine(p){
    this.#approved(p);if(p.destructiveAck!==true)throw new Error('destructiveAck=true is required to delete a Speech Engine resource');
    const id=this.#segment(p.speechEngineId,'speechEngineId');
    await this.#request('DELETE','/v1/speech-engine/'+id,{expect:'none'});
    return {deleted:true,speechEngineId:String(p.speechEngineId),observedHttpStatus:204};
  }

  async #musicDetailed(p){
    this.#approved(p);
    if((p.prompt==null)===(p.compositionPlan==null))throw new Error('Provide exactly one of prompt or compositionPlan');
    if(p.prompt!=null)this.#text(p.prompt,'prompt',4100);
    const body=this.#clean({prompt:p.prompt,composition_plan:p.compositionPlan,music_length_ms:p.musicLengthMs,model_id:p.modelId??'music_v2_5',seed:p.seed,force_instrumental:p.forceInstrumental,store_for_inpainting:p.storeForInpainting,sign_with_c2pa:p.signWithC2pa});
    const {bytes,contentType}=await this.#raw('POST','/v1/music/detailed',body);
    const parts=this.#multipart(bytes,contentType);
    const meta=parts.find(x=>/json/i.test(x.contentType));
    const audio=parts.find(x=>/^audio\//i.test(x.contentType))??parts.find(x=>!/json/i.test(x.contentType));
    if(!meta||!audio)throw new Error('Detailed music response is missing metadata or audio');
    const artifact=await this.#save(audio.body,p.outputPath??'artifacts/elevenlabs/music-detailed.mp3',audio.contentType);
    return {...artifact,metadata:JSON.parse(meta.body.toString('utf8')),multipart:true};
  }

  async #dialogueWithTimestamps(p){
    this.#approved(p);
    if(!Array.isArray(p.inputs)||p.inputs.length===0)throw new Error('inputs must be a non-empty array');
    const total=p.inputs.reduce((n,x)=>n+String(x?.text??'').length,0);if(total>2000)throw new Error('Dialogue text exceeds the reliable 2000-character request limit');
    const inputs=p.inputs.map(x=>({text:this.#text(x.text,'dialogue text',2000),voice_id:this.#text(x.voiceId,'voiceId',256)}));
    const q=new URLSearchParams();if(p.outputFormat)q.set('output_format',String(p.outputFormat));
    const r=await this.#json('POST','/v1/text-to-dialogue/with-timestamps'+(q.size?'?'+q:''),this.#clean({inputs,model_id:p.modelId??'eleven_v3',language_code:p.languageCode,seed:p.seed,settings:p.settings}));
    const encoded=r.audio_base_64??r.audio_base64??null;
    if(!encoded)return {...r,saved:false};
    const artifact=await this.#save(Buffer.from(String(encoded),'base64'),p.outputPath??'artifacts/elevenlabs/dialogue-timestamps.mp3','audio/mpeg');
    const clean={...r};delete clean.audio_base_64;delete clean.audio_base64;return {...clean,...artifact};
  }

  #validateSfx(p){
    if(p.durationSeconds!=null&&(typeof p.durationSeconds!=='number'||p.durationSeconds<0.5||p.durationSeconds>30))throw new Error('durationSeconds must be 0.5..30');
    if(p.promptInfluence!=null&&(typeof p.promptInfluence!=='number'||p.promptInfluence<0||p.promptInfluence>1))throw new Error('promptInfluence must be 0..1');
  }
  async #validateAlignmentFile(p){const file=this.#path(p.inputPath);const info=await stat(file);if(info.size>=1_000_000_000)throw new Error('Forced Alignment input file must be smaller than 1GB');}
  #billingAck(p){if(p.billingAck!==true)throw new Error('billingAck=true is required for dubbing project/language billing');}
  #approved(p){if(p?.approved!==true)throw new Error('approved=true is required for credit-consuming or provider-mutating ElevenLabs operations');}
  #key(){const k=this.env.ELEVENLABS_API_KEY;if(!k)throw new Error('ELEVENLABS_API_KEY is not configured in the runtime environment');return k;}
  #segment(v,n){const s=String(v??'');if(!/^[A-Za-z0-9_.:-]{1,256}$/.test(s))throw new Error(n+' is invalid');return encodeURIComponent(s);}
  #text(v,n,max){const s=String(v??'');if(!s.trim())throw new Error(n+' is required');if(s.length>max)throw new Error(n+' exceeds '+max+' characters');return s;}
  #path(v){const p=resolve(this.root,String(v??''));if(p!==this.root&&!p.startsWith(this.root+'/'))throw new Error('Path escapes workspace root: '+v);return p;}
  #clean(v){return Object.fromEntries(Object.entries(v).filter(([,x])=>x!==undefined));}

  async #request(method,path,{body,expect='json'}={}){
    const headers={'xi-api-key':this.#key()};if(body!=null)headers['content-type']='application/json';
    const c=new AbortController(),t=setTimeout(()=>c.abort(),120000);
    try{
      const r=await this.fetchImpl(API_BASE+path,{method,headers,body:body==null?undefined:JSON.stringify(body),signal:c.signal});
      if(!r.ok){const x=await r.text();throw new Error('ElevenLabs HTTP '+r.status+': '+x.slice(0,1000));}
      if(expect==='none')return null;if(expect==='json')return await r.json();return Buffer.from(await r.arrayBuffer());
    }finally{clearTimeout(t);}
  }
  async #json(method,path,body){return await this.#request(method,path,{body,expect:'json'});}
  async #raw(method,path,body){const headers={'xi-api-key':this.#key(),'content-type':'application/json'};const c=new AbortController(),t=setTimeout(()=>c.abort(),120000);try{const r=await this.fetchImpl(API_BASE+path,{method,headers,body:JSON.stringify(body),signal:c.signal});if(!r.ok){const x=await r.text();throw new Error('ElevenLabs HTTP '+r.status+': '+x.slice(0,1000));}return {bytes:Buffer.from(await r.arrayBuffer()),contentType:r.headers.get('content-type')??''};}finally{clearTimeout(t);}}
  #multipart(bytes,contentType){const m=/boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(String(contentType??'')),b=m?.[1]??m?.[2];if(!b)throw new Error('Expected multipart/mixed boundary');const marker=Buffer.from('--'+b),delim=Buffer.from('\r\n--'+b),out=[];let pos=bytes.indexOf(marker);while(pos>=0){let s=pos+marker.length;if(bytes.subarray(s,s+2).toString()==='--')break;if(bytes.subarray(s,s+2).toString()==='\r\n')s+=2;const he=bytes.indexOf(Buffer.from('\r\n\r\n'),s);if(he<0)break;const hs=bytes.subarray(s,he).toString('utf8'),bs=he+4;let next=bytes.indexOf(delim,bs);if(next<0)next=bytes.length;const headers=Object.fromEntries(hs.split(/\r\n/).map(line=>{const i=line.indexOf(':');return i>0?[line.slice(0,i).trim().toLowerCase(),line.slice(i+1).trim()]:null;}).filter(Boolean));out.push({headers,contentType:headers['content-type']??'application/octet-stream',body:bytes.subarray(bs,next)});pos=bytes.indexOf(marker,next+2);}return out;}
  async #save(bytes,outputPath,contentType=null){const p=this.#path(outputPath);await mkdir(dirname(p),{recursive:true});await writeFile(p,bytes);return {saved:true,path:p,size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),contentType,createdAt:this.now().toISOString()};}
}
