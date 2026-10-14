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