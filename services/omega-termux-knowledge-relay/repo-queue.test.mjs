import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTask, createRepoQueueWorker } from './repo-queue.mjs';

const issuedAt = new Date().toISOString();
const good = { id: 'android-probe-001', issuedAt, method: 'terminal.status', params: {} };

test('allows bounded read-only diagnostics', () => {
  assert.equal(validateTask(good).method, 'terminal.status');
  assert.equal(validateTask({...good, method: 'terminal.run', params: {argv: ['pwd'], sideEffect: 'R', cwd: '.'}}).method, 'terminal.run');
  assert.equal(validateTask({...good, method: 'terminal.run', params: {argv: ['node', '--version'], sideEffect: 'R'}}).method, 'terminal.run');
});
test('rejects unsafe, expired, or stale operations', () => {
  for (const data of [
    {...good, method:'terminal.run',params:{argv:['sh','-c','pwd'],sideEffect:'R'}},
    {...good, method:'terminal.run',params:{argv:['npm','install'],sideEffect:'L'}},
    {...good, method:'terminal.run',params:{argv:['pwd'],sideEffect:'L'}},
    {...good, method:'terminal.run',params:{argv:['pwd'],sideEffect:'R',cwd:'../'}},
    {...good, issuedAt:'2020-01-01T00:00:00Z'},
    {...good, method:'knowledge.read', params:{path:'private'}},
  ]) assert.throws(() => validateTask(data));
});
test('processes an authenticated-main task only once, logs execution receipt', async () => {
  const calls=[], logs=[];
  const worker=createRepoQueueWorker({
    fetchTask:async()=>good,
    run:async(m,p)=>{calls.push([m,p]);return {available:true,armed:false};},
    log:(x)=>logs.push(x),
  });
  await worker.tick(); await worker.tick();
  assert.equal(calls.length,1);
  assert.equal(logs.filter(s=>s.includes('OMEGA_REPO_JOB_RESULT')).length,1);
  assert.match(logs.at(-1), /"available":true/);
});
test('does not mark offline tasks done, so reconnect can retry', async () => {
  let tries=0;
  const worker=createRepoQueueWorker({
    fetchTask:async()=>good,
    run:async()=>{tries++;if(tries===1) throw new Error('agent_offline');return {available:true};},
    log:()=>{},
  });
  await worker.tick();await worker.tick();
  assert.equal(tries,2);
});
test('provides explicit receipt for expired task rather than silent rejection', async () => {
  const bad = {...good, issuedAt:'2020-01-01T00:00:00Z'};
  const logs=[];
  const worker=createRepoQueueWorker({
    fetchTask:async()=>bad, run:async()=>{throw Error('should_not_execute');},
    log:(entry)=>logs.push(entry)
  });
  await worker.tick(); await worker.tick();
  assert.equal(logs.filter(x=>x.startsWith('OMEGA_REPO_JOB_REJECTED ')).length,1);
  assert.match(logs[0], /expired/);
});
test('acknowledges device-consent denial without endless retries', async () => {
  const logs=[];
  let calls=0;
  const task={...good, id:'android-consent-denied-1',method:'terminal.run',params:{argv:['pwd'],sideEffect:'R'}};
  const worker=createRepoQueueWorker({fetchTask:async()=>task,run:async()=>{calls++;throw Error('Remote terminal disabled: arm it locally in Termux before use');},log:x=>logs.push(x)});
  await worker.tick(); await worker.tick();
  assert.equal(calls,1);
  assert.match(logs.at(-1), /OMEGA_REPO_JOB_RESULT /);
  assert.match(logs.at(-1), /consent_required/);
});
test('supports read-only knowledge status without terminal grant', () => {
  assert.equal(validateTask({...good,id:'knowledge-status-001',method:'knowledge.info'}).method,'knowledge.info');
});
test('allows scoped local changes with explicit L flag for device-authorized full grant', () => {
  const t={...good,id:'full-readwrite-001',method:'terminal.run',params:{argv:['pkg','install','openssl-tool','-y'],sideEffect:'L',cwd:'.'}};
  const parsed=validateTask(t);
  assert.deepEqual(parsed.params.argv,t.params.argv);
  assert.equal(parsed.params.sideEffect,'L');
});
test('blocks shell launch, parent escape, credentials, and unsafe args before phone', () => {
  const argvSets=[['sh','-c','echo unsafe'],['bash','-lc','echo unsafe'],['node','-e','console.log(1)'],['ls','../'],['ls','.config/omega/relay_agent_token'],['git','push']];
  for(const argv of argvSets){
    assert.throws(()=>validateTask({...good,id:'bad-repo-job-123',method:'terminal.run',params:{argv,sideEffect:'L',cwd:'.'}}));
  }
  assert.throws(()=>validateTask({...good,method:'terminal.run',params:{argv:['pwd'],sideEffect:'R',cwd:'../'}}));
});
