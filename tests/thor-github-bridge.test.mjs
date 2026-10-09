import test from 'node:test';
import assert from 'node:assert/strict';
import { executeIssue, parseRequest, approvedIssue } from '../scripts/thor-github-bridge.mjs';

const issue = (title, body, user = 'mojealterego') => ({issue:{number:22,title,body,user:{login:user}},repository:{full_name:'mojealterego/Agent-God-Level-Omega',owner:{login:'mojealterego'}}});

test('rejects requests from non-owners', () => {
  assert.equal(approvedIssue(issue('[THOR] Probe','{}','attacker')),false);
});
test('rejects issues without THOR marker', () => {
  assert.equal(approvedIssue(issue('unrelated task','{}')),false);
});
test('reads valid task contract and rejects remote shell payload', () => {
  assert.equal(parseRequest(issue('[THOR] Audit','```omega-task\n{"goal":"Verify build","requiredCapabilities":["quality-gate"]}\n```')).goal,'Verify build');
  assert.throws(()=>parseRequest(issue('[THOR] Bad','```omega-task\n{"goal":"Check","argv":["sh","-c","echo evil"]}\n```')),/unsupported/i);
});
test('executes real QA capability with observed runner and no fabricated completion', async () => {
  let observed=[];
  const event=issue('[THOR] Audit','```omega-task\n{"goal":"audit code","requiredCapabilities":["quality-gate"]}\n```');
  const result=await executeIssue(event,{check: async (kind)=>{observed.push(kind);return {ok:true,evidence:`test:exit=0:${kind}`};}});
  assert.deepEqual(observed,['quality-gate']);
  assert.equal(result.finalized,true);
  assert.equal(result.task.status,'DONE');
  assert.equal(result.assignments.length,1);
});
test('unsupported specialist stays blocked and Thor refuses false completion', async () => {
  const event=issue('[THOR] Build an app','```omega-task\n{"goal":"Build an app","requiredCapabilities":["web-build"]}\n```');
  const result=await executeIssue(event,{check:async()=>({ok:true,evidence:'test:exit=0'})});
  assert.equal(result.finalized,false);
  assert.ok(result.blockers.length>=1);
});
test('failed test is not marked as DONE', async()=>{
  const event=issue('[THOR] QA','```omega-task\n{"goal":"test app","requiredCapabilities":["quality-gate"]}\n```');
  const result=await executeIssue(event,{check:async()=>({ok:false,evidence:'test:exit=1'})});
  assert.equal(result.finalized,false);
  assert.equal(result.task.status,'FAILED');
});
