import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GeminiInteractionsClient, extractGeminiText } from '../src/asgard/gemini-interactions.mjs';
import { AsgardRuntime } from '../src/asgard/asgard-runtime.mjs';
import { IvarResearchBroker } from '../src/asgard/asgard-architecture.mjs';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

function response(body,status=200){return {ok:status>=200&&status<300,status,async text(){return JSON.stringify(body);}};}

test('Gemini model interaction maps official REST fields and never exposes key',async()=>{
  const calls=[];const client=new GeminiInteractionsClient({apiKey:'secret-key',fetchImpl:async(url,opt)=>{calls.push({url,opt});return response({id:'v1_a',status:'completed',output_text:'ok'});}});
  const out=await client.createModel({input:'hello',model:'gemini-3.8-flash',previousInteractionId:'v1_prev',background:true,store:true});
  assert.equal(out.id,'v1_a');const body=JSON.parse(calls[0].opt.body);assert.equal(body.previous_interaction_id,'v1_prev');assert.equal(body.background,true);assert.equal(calls[0].opt.headers['x-goog-api-key'],'secret-key');assert.equal(JSON.stringify(client.configuration()).includes('secret-key'),false);
});

test('Gemini Deep Research uses background execution and official agent config',async()=>{
  const calls=[];const client=new GeminiInteractionsClient({apiKey:'k',fetchImpl:async(url,opt)=>{calls.push({url,opt});return response({id:'r1',status:'in_progress'});}});
  const out=await client.createDeepResearch({input:'research X',tools:[{type:'url_context'}]});assert.equal(out.status,'in_progress');const body=JSON.parse(calls[0].opt.body);assert.equal(body.agent,'deep-research-preview-04-2026');assert.equal(body.agent_config.type,'deep-research');assert.equal(body.background,true);assert.deepEqual(body.tools,[{type:'url_context'}]);
});

test('Gemini polling retrieves terminal result with Api-Revision header',async()=>{
  let n=0;const client=new GeminiInteractionsClient({apiKey:'k',fetchImpl:async(url,opt)=>{n++;if(n===1)return response({id:'x',status:'in_progress'});return response({id:'x',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'final report'}]}]});}});
  const out=await client.awaitCompletion('x',{pollIntervalMs:0,maxPolls:5});assert.equal(out.completed,true);assert.equal(out.text,'final report');assert.equal(extractGeminiText(out.interaction),'final report');
});

test('Gemini bridge fails closed when API key is absent',async()=>{const c=new GeminiInteractionsClient({env:{},fetchImpl:async()=>response({})});const d=await c.doctor();assert.equal(d.ready,false);assert.equal(d.reason,'GEMINI_API_KEY_UNAVAILABLE');await assert.rejects(()=>c.createModel({input:'x'}),/API key unavailable/i);});

test('Ivar supports Gemini Interactions transport and cross-model synthesis readiness',()=>{const i=new IvarResearchBroker();i.registerProvider({id:'chatgpt-host',kind:'CHATGPT',transport:'HOST_ORCHESTRATION',authorized:true});i.registerProvider({id:'gemini',kind:'GEMINI',transport:'GEMINI_INTERACTIONS_API',authorized:true});const p=i.createProject({title:'P',brief:'B'});i.recordResult(p.id,{providerId:'chatgpt-host',result:{text:'A'}});assert.equal(i.synthesisPacket(p.id).ready,false);i.recordResult(p.id,{providerId:'gemini',result:{text:'B'}});assert.equal(i.synthesisPacket(p.id).ready,true);});

test('ASGARD runtime starts Gemini job and records it into Ivar project',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard17-gemini-'));try{const fetchImpl=async(url,opt)=>response({id:'g1',status:'in_progress',object:'interaction'});const r=new AsgardRuntime({root,env:{GEMINI_API_KEY:'k'},fetchImpl});const p=await r.action({action:'ivar-project-create',payload:{title:'X',brief:'Deep research X'}});const d=await r.action({action:'ivar-dispatch',payload:{id:p.id,arguments:{geminiMode:'deep-research'}}});const gj=d.jobs.find(x=>x.kind==='GEMINI');const cj=d.jobs.find(x=>x.kind==='CHATGPT');assert.equal(gj.interactionId,'g1');assert.equal(cj.status,'HOST_ORCHESTRATION_REQUIRED');assert.equal(d.vpnClaimed,false);}finally{await rm(root,{recursive:true,force:true});}});

test('Cross-model start creates ChatGPT host + Gemini API workflow',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard17-cross-'));try{const r=new AsgardRuntime({root,env:{GEMINI_API_KEY:'k'},fetchImpl:async()=>response({id:'g2',status:'in_progress'})});const out=await r.action({action:'ivar-cross-model-start',payload:{title:'Joint',brief:'work together'}});assert.equal(out.jobs.length,2);assert.match(out.chatgptInstruction,/ChatGPT-side/i);assert.equal(out.vpnClaimed,false);}finally{await rm(root,{recursive:true,force:true});}});

test('ASGARD state persists provider metadata but not Gemini API key',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard17-state-'));try{const r=new AsgardRuntime({root,env:{GEMINI_API_KEY:'supersecret'},fetchImpl:async()=>response({})});const saved=await r.action({action:'state-save'});assert.equal(saved.version,20);const raw=await readFile(saved.path,'utf8');assert.equal(raw.includes('supersecret'),false);assert.equal(raw.includes('GEMINI_API_KEY'),true);}finally{await rm(root,{recursive:true,force:true});}});

test('control plane exposes Gemini collaboration capability',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard17-cp-'));try{const p=new OmegaControlPlane({workspaceRoots:[root],env:{}});const caps=await p.capabilities();assert.ok(caps.some(x=>x.id==='asgard.gemini'));const out=await p.asgard({cwd:root,action:'ivar-gemini-doctor',payload:{}});assert.equal(out.ready,false);}finally{await rm(root,{recursive:true,force:true});}});
