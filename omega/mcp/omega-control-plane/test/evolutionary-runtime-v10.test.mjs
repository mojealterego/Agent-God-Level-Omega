import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EvolutionaryArchitectureRuntime } from '../src/evolution/evolutionary-runtime.mjs';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('evolutionary runtime sandbox tournament only promotes measured hard-gate passing output', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-evo-runtime-'));
  const sandboxRunner=async ({command})=>({exitCode:0,stdout:JSON.stringify(command[0]==='base'?{latency:100,errors:0,cost:10}:{latency:70,errors:0,cost:8}),stderr:'',durationMs:1});
  const r=new EvolutionaryArchitectureRuntime({root,sandboxRunner});
  const out=await r.action({action:'sandbox-tournament',payload:{baseline:{id:'base',command:['base']},candidates:[{id:'candidate',command:['candidate']}],hardGates:[{metric:'errors',op:'<=',value:0}],objectives:[{metric:'latency',direction:'min',weight:1},{metric:'cost',direction:'min',weight:1}]}});
  assert.equal(out.promote,true);
  assert.equal(out.winner.id,'candidate');
});

test('ephemeral tool runner executes only through sandbox runner and removes temporary source', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-ephemeral-'));
  let workspace;
  const sandboxRunner=async (input)=>{workspace=input.workspace; await access(join(workspace,'tool.py')); return {exitCode:0,stdout:'ok',stderr:''};};
  const r=new EvolutionaryArchitectureRuntime({root,sandboxRunner});
  const out=await r.action({action:'ephemeral-tool-run',payload:{id:'x',content:'print("ok")'}});
  assert.equal(out.stdout,'ok');
  await assert.rejects(()=>access(workspace));
});

test('chaos sandbox execution is refused in production before runner invocation', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-chaos-'));
  let called=false;
  const r=new EvolutionaryArchitectureRuntime({root,sandboxRunner:async()=>{called=true;return {exitCode:0};}});
  await assert.rejects(()=>r.action({action:'chaos-sandbox-run',payload:{environment:'production',authorized:true,command:['false']}}),/production/i);
  assert.equal(called,false);
});

test('control plane exposes persistent evolutionary state without branch or external mutations', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-evo-plane-'));
  const plane=new OmegaControlPlane({workspaceRoots:[root]});
  await plane.evolutionaryArchitecture({cwd:root,action:'state-snapshot',payload:{state:{version:'10',capabilities:['x'],metrics:{latency:4}}}});
  const latest=await plane.evolutionaryArchitecture({cwd:root,action:'state-latest',payload:{}});
  assert.equal(latest.version,'10');
  await plane.close();
});
