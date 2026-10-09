import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOwnerIssue, executeAiTask, infer, formatResult } from '../scripts/thor-ai-worker.mjs';

const valid = {repository:{full_name:'mojealterego/Agent-God-Level-Omega',owner:{login:'mojealterego'}}, issue:{number:11,user:{login:'mojealterego'},title:'[THOR-AI] Build a queue',body:'No shell execution'}};
test('rejects unauthorized issuers',()=>assert.throws(()=>parseOwnerIssue({...valid,issue:{...valid.issue,user:{login:'outsider'}}}),/Unauthorized/));
test('rejects oversized instructions',()=>assert.throws(()=>parseOwnerIssue({...valid,issue:{...valid.issue,body:'x'.repeat(6001)}}),/Invalid/));
test('rejects foreign repositories',()=>assert.throws(()=>parseOwnerIssue({...valid,repository:{full_name:'outsider/fork',owner:{login:'outsider'}}}),/Unauthorized/));
test('three real-role dispatches are sequential and labeled',async()=>{
  const roles=[];
  const result = await executeAiTask(valid,{inference:async messages=>{roles.push(messages[0].content);return 'verified stub answer '+roles.length;}});
  assert.equal(result.modelCalls,3);
  assert.equal(result.codeExecuted,false);
  assert.match(roles[1],/implementer/);
  assert.match(roles[2],/reviewer/);
  assert.match(formatResult(result),/not built, tested, committed or deployed/);
});
test('inference failure does not claim success',async()=>{
  await assert.rejects(executeAiTask(valid,{inference:async()=>{throw new Error('model unavailable')}}),/model unavailable/);
});
test('model success requires an actual response',async()=>{
  const fake=async()=>({ok:true,json:async()=>({choices:[{message:{content:'  model returned  '}}]})});
  assert.equal(await infer([{role:'user',content:'x'}],{token:'mock-token',fetchImpl:fake}),'model returned');
});
test('HTTP inference failure surfaces the status',async()=>{
  const fake=async()=>({ok:false,status:403});
  await assert.rejects(infer([{role:'user',content:'x'}],{token:'mock-token',fetchImpl:fake}),/403/);
});
