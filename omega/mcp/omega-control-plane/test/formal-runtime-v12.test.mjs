import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FormalEpistemicRuntime } from '../src/formal/formal-runtime.mjs';

test('assumption ledger persists and resolves uncertainty', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-formal-'));
  const r=new FormalEpistemicRuntime({root});
  await r.action({action:'assumption-add',payload:{record:{id:'a1',claim:'API is stable',confidence:.5,evidence:['e1']}}});
  assert.equal((await r.action({action:'assumption-get',payload:{id:'a1'}})).status,'OPEN');
  await r.action({action:'assumption-resolve',payload:{id:'a1',update:{status:'DISPROVEN',evidence:['e2']}}});
  const item=await r.action({action:'assumption-get',payload:{id:'a1'}});
  assert.equal(item.status,'DISPROVEN'); assert.deepEqual(item.evidence,['e1','e2']);
});

test('replica tournament is bounded, air-gapped and selects measured winner', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-replicas-')); const calls=[];
  const r=new FormalEpistemicRuntime({root,sandboxRunner:async input=>{calls.push(input); const fast=input.command.includes('fast'); return {exitCode:0,stdout:JSON.stringify({quality:1,latency:fast?5:20}),stderr:'',durationMs:fast?5:20};}});
  const out=await r.action({action:'replica-tournament',payload:{baseline:{id:'base',command:['node','base']},candidates:[{id:'r1',seed:1,command:['node','fast']}],objectives:[{key:'quality',direction:'max',weight:10},{key:'latency',direction:'min',weight:1}],hardGates:[{key:'quality',min:1}]}});
  assert.equal(out.winner.id,'r1'); assert.equal(out.mergeEligible,true); assert.equal(calls.every(c=>c.network==='none'&&c.writable===false),true); assert.equal(out.persistentSelfReplication,false);
});

test('formal runtime finite-state verification reports counterexample without bug-free claim', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-fsm-')); const r=new FormalEpistemicRuntime({root});
  const out=await r.action({action:'fsm-verify',payload:{initial:'A',transitions:{A:['BAD'],BAD:[]},forbiddenStates:['BAD']}});
  assert.equal(out.valid,false); assert.equal(out.counterexample.state,'BAD');
});
