import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEvent,getGitHubOidc,inference,runLive} from '../scripts/thor-lovable-agent.mjs';
const event={repository:{full_name:'mojealterego/Agent-God-Level-Omega',owner:{login:'mojealterego'}},issue:{number:77,title:'[THOR-LOVABLE] Build secure task queue',user:{login:'mojealterego'},body:'acceptance criteria'}};
test('rejects outside issue owner',()=>assert.throws(()=>validateEvent({...event,issue:{...event.issue,user:{login:'other'}}}),/UNAUTHORIZED/));
test('rejects wrong issue prefix',()=>assert.throws(()=>validateEvent({...event,issue:{...event.issue,title:'[THOR-COPILOT] Bad tag'}}),/NOT_THOR_LOVABLE/));
test('needs authenticated OIDC environment',()=>assert.rejects(getGitHubOidc({env:{}}),/OIDC_UNAVAILABLE/));
test('OIDC minted with constrained audience',async()=>{
 let v; const token=await getGitHubOidc({env:{ACTIONS_ID_TOKEN_REQUEST_URL:'https://example.com/oidc?x=1',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'secret'},fetchImpl:async (url,opts)=>{v={url:String(url),auth:opts.headers.Authorization};return {ok:true,json:async()=>({value:'one.two.three'})}}});
 assert.equal(token,'one.two.three');assert.match(v.url,/audience=omega-agent-runtime/);assert.equal(v.auth,'Bearer secret');
});
test('refuses forged gateway ok without evidence',async()=>{
 await assert.rejects(inference('architect','a valid sufficiently long prompt',{token:'x',runId:'123',fetchImpl:async()=>({ok:true,status:200,text:async()=>JSON.stringify({ok:true,role:'architect',provider:'lovable-ai',content:'OK'})})}),/INVALID_RESULT/);
});
test('refuses unauthenticated error',async()=>{
 await assert.rejects(inference('architect','a valid prompt',{token:'x',runId:'123',fetchImpl:async()=>({ok:false,status:401,text:async()=>JSON.stringify({ok:false,error:'invalid_token'})})}),/GATEWAY_401_invalid_token/);
});
test('three stages use real remote result shape',async()=>{
 let n=0;const result=await runLive(event,{env:{GITHUB_RUN_ID:'37973367368'},oidc:async()=> 'a.b.c',fetchImpl:async(_url,options)=>{
  const q=JSON.parse(options.body);n++;
  assert.equal(q.runId,'37973367368');
  return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,role:q.agentRole,provider:'lovable-ai',content:'Remote verified sample for '+q.agentRole+' to verify the agent.'})}
 }});
 assert.equal(result.modelInvocations,3);assert.equal(n,3);assert.equal(result.codeExecuted,false);
});
test('rejects invalid non-JSON gateway success',async()=>assert.rejects(inference('architect','x',{token:'x',runId:'9',fetchImpl:async()=>({ok:true,status:200,text:async()=> 'OK'})}),/INVALID_JSON/));
