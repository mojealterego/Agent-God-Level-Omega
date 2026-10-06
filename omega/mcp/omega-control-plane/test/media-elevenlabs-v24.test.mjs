import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ElevenLabsMediaRuntime } from '../src/media/elevenlabs-runtime.mjs';

function jsonResponse(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json'}});}
function audioResponse(value='AUDIO'){return new Response(Buffer.from(value),{status:200,headers:{'content-type':'audio/mpeg'}});}

async function runtime(fetchImpl,env={ELEVENLABS_API_KEY:'secret-test-key'}){const root=await mkdtemp(join(tmpdir(),'omega-v24-'));return {root,rt:new ElevenLabsMediaRuntime({root,env,fetchImpl,now:()=>new Date('2026-10-06T00:00:00Z')})};}

test('doctor exposes secret reference but never value',async()=>{const {rt}=await runtime(async()=>jsonResponse({}));const r=await rt.action({action:'doctor'});assert.equal(r.available,true);assert.equal(JSON.stringify(r).includes('secret-test-key'),false);});

test('billable generation fails closed without explicit approval',async()=>{const {rt}=await runtime(async()=>audioResponse());await assert.rejects(()=>rt.action({action:'music-compose',payload:{prompt:'original instrumental',outputPath:'x.mp3'}}),/approved=true/);});

test('music plan uses verified endpoint and does not require billing approval',async()=>{let req;const {rt}=await runtime(async(url,opts)=>{req={url,opts};return jsonResponse({chunks:[]});});const r=await rt.action({action:'music-plan',payload:{prompt:'original ambient score',musicLengthMs:10000}});assert.deepEqual(r,{chunks:[]});assert.equal(req.url,'https://api.elevenlabs.io/v1/music/plan');assert.equal(req.opts.headers['xi-api-key'],'secret-test-key');});

test('music compose saves immutable evidence',async()=>{const {root,rt}=await runtime(async()=>audioResponse('abc'));const r=await rt.action({action:'music-compose',payload:{approved:true,prompt:'original electronic score',musicLengthMs:10000,outputPath:'artifacts/music.mp3'}});assert.equal(r.saved,true);assert.equal(r.size,3);assert.equal((await readFile(join(root,'artifacts/music.mp3'))).toString(),'abc');assert.match(r.sha256,/^[0-9a-f]{64}$/);});

test('dialogue enforces the 2000 character reliability bound',async()=>{const {rt}=await runtime(async()=>audioResponse());await assert.rejects(()=>rt.action({action:'dialogue-generate',payload:{approved:true,inputs:[{text:'x'.repeat(2001),voiceId:'v1'}]}}),/2000-character/);});

test('forced alignment sends multipart and returns structured timing',async()=>{let seen;const {root,rt}=await runtime(async(url,opts)=>{seen={url,opts};return jsonResponse({words:[{text:'hello',start:0,end:.5}],loss:.1});});await writeFile(join(root,'a.wav'),'bytes');const r=await rt.action({action:'forced-align',payload:{approved:true,inputPath:'a.wav',text:'hello'}});assert.equal(r.words[0].text,'hello');assert.equal(seen.url,'https://api.elevenlabs.io/v1/forced-alignment');assert.equal(seen.opts.body instanceof FormData,true);});

test('speech engine requires secure public websocket URL',async()=>{const {rt}=await runtime(async()=>jsonResponse({speech_engine_id:'seng_1'}));await assert.rejects(()=>rt.action({action:'speech-engine-create',payload:{approved:true,wsUrl:'ws://localhost:3001'}}),/wss:\/\//);const ok=await rt.action({action:'speech-engine-create',payload:{approved:true,wsUrl:'wss://voice.example.test/ws'}});assert.equal(ok.speech_engine_id,'seng_1');});

test('voice isolation keeps local files inside workspace root',async()=>{const {root,rt}=await runtime(async()=>audioResponse('clean'));await writeFile(join(root,'noisy.mp3'),'noise');const r=await rt.action({action:'voice-isolate',payload:{approved:true,inputPath:'noisy.mp3',outputPath:'out/clean.mp3'}});assert.equal(r.size,5);await assert.rejects(()=>rt.action({action:'voice-isolate',payload:{approved:true,inputPath:'../escape.mp3'}}),/escapes workspace/);});

test('dubbing creation is charge-gated and accepts one source mode',async()=>{let body;const {rt}=await runtime(async(url,opts)=>{body=opts.body;return jsonResponse({project_id:'proj_1',status:'queued'},201);});const r=await rt.action({action:'dubbing-project-create',payload:{approved:true,sourceUrl:'https://example.test/media.mp4',targetLanguage:'pl'}});assert.equal(r.project_id,'proj_1');assert.equal(body instanceof FormData,true);});

test('completed image generation downloads from provider state only',async()=>{let n=0;const {root,rt}=await runtime(async(url)=>{n++;if(n===1)return jsonResponse({id:'gen_1',status:'completed',content_url:'https://cdn.example.test/x.png'});return new Response(Buffer.from('PNG'),{status:200,headers:{'content-type':'image/png'}});});const r=await rt.action({action:'image-download',payload:{generationId:'gen_1',outputPath:'images/x.png'}});assert.equal(r.saved,true);assert.equal((await readFile(join(root,'images/x.png'))).toString(),'PNG');});

test('image/video create require explicit model and approval',async()=>{let captured;const {rt}=await runtime(async(url,opts)=>{captured={url,body:JSON.parse(opts.body)};return jsonResponse({id:'g1',status:'pending'});});await rt.action({action:'video-create',payload:{approved:true,modelId:'veo-3.1-fast-generate-001',request:{prompt:'original scene',duration_secs:4}}});assert.equal(captured.url,'https://api.elevenlabs.io/v1/flows/video');assert.equal(captured.body.model_id,'veo-3.1-fast-generate-001');});
