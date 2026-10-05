import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsiArchitectureRuntime } from '../src/asi/asi-runtime.mjs';

test('ASI runtime persists anticipatory memory and retrospective correction', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-asi-runtime-'));
  const r=new AsiArchitectureRuntime({root});
  await r.action({action:'future-put',payload:{id:'rate',signature:'429 rate limit',plan:{action:'backoff'}}});
  assert.equal((await r.action({action:'future-recall',payload:{signature:'rate limit 429'}})).plan.action,'backoff');
  await r.action({action:'retro-record',payload:{decisionId:'d1',signature:'drop validation',reason:'security'}});
  assert.equal((await r.action({action:'retro-evaluate',payload:{signature:'drop validation'}})).blocked,true);
});

test('world replay runs bounded sandbox scenarios and records pass rate', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-world-'));
  const calls=[];
  const r=new AsiArchitectureRuntime({root,sandboxRunner:async input=>{calls.push(input); return {exitCode:input.command.includes('bad')?1:0,stdout:'ok',stderr:'',durationMs:5};}});
  const out=await r.action({action:'world-replay',payload:{scenarios:[
    {id:'good',command:['node','good'],expectedExitCode:0},
    {id:'bad',command:['node','bad'],expectedExitCode:1}
  ]}});
  assert.equal(out.passRate,1);
  assert.equal(calls.every(x=>x.network==='none'),true);
});

test('QPU bridge executes only through explicitly supplied external runner and carries QASM', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-qpu-'));
  const r=new AsiArchitectureRuntime({root,quantumRunner:async input=>({provider:'mock-qpu',shots:input.shots,qasm:input.qasm})});
  const out=await r.action({action:'qpu-execute',payload:{providerId:'q',toolName:'run',shots:128,circuit:{qubits:2,ops:[['h',0],['cx',0,1]],measureAll:true}}});
  assert.equal(out.available,true);
  assert.match(out.result.qasm,/OPENQASM 3/);
  assert.equal(out.quantumAdvantageClaimed,false);
});

test('QPU bridge is fail-closed when no external runner exists', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-qpu-none-'));
  const r=new AsiArchitectureRuntime({root});
  const out=await r.action({action:'qpu-execute',payload:{circuit:{qubits:1,ops:[],measureAll:true}}});
  assert.equal(out.available,false);
});

test('ZK verifier bridge delegates proof verification and never fabricates local zk proof', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-zk-'));
  const r=new AsiArchitectureRuntime({root,zkVerifier:async input=>({valid:input.proof==='proof',engine:'mock-snark'})});
  const out=await r.action({action:'zk-verify',payload:{providerId:'zk',toolName:'verify',proof:'proof',publicInputs:['1'],verificationKey:'vk'}});
  assert.equal(out.available,true);
  assert.equal(out.result.valid,true);
  assert.equal(out.localZkSnarkGenerated,false);
});

test('HDL check uses external toolchain callback and reports unavailable otherwise', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-hdl-'));
  const r=new AsiArchitectureRuntime({root,hdlRunner:async input=>({available:true,tool:'iverilog',exitCode:0,sourcePath:input.sourcePath})});
  const out=await r.action({action:'hdl-check',payload:{language:'verilog',top:'top',source:'module top; endmodule'}});
  assert.equal(out.available,true);
  assert.equal(out.result.exitCode,0);
  const r2=new AsiArchitectureRuntime({root:await mkdtemp(join(tmpdir(),'omega-hdl-none-'))});
  assert.equal((await r2.action({action:'hdl-check',payload:{language:'verilog',source:'module top; endmodule'}})).available,false);
});

test('semantic graph and boundary actions maintain alignment-aware invalidation', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-semantic-'));
  const r=new AsiArchitectureRuntime({root});
  await r.action({action:'semantic-upsert',payload:{id:'policy',value:{version:1}}});
  await r.action({action:'semantic-upsert',payload:{id:'app',value:{version:1}}});
  await r.action({action:'semantic-link',payload:{dependent:'app',dependency:'policy'}});
  const changed=await r.action({action:'semantic-upsert',payload:{id:'policy',value:{version:2}}});
  assert.deepEqual(changed.invalidated,['app']);
  const auth=await r.action({action:'boundary-authorize',payload:{path:'src/core/policy.mjs',core:['src/core/policy.mjs'],approved:false}});
  assert.equal(auth.allowed,false);
});
