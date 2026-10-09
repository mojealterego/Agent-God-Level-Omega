import test from 'node:test';
import assert from 'node:assert/strict';
import {preflight, TinyFishClient} from './adapter.mjs';

const approved = {url:'https://scrapeme.live/shop', goal:'Extract first two prices', scope:'read', approved:true};
const environment = {allowedHosts:'scrapeme.live', runsEnabled:true, writesEnabled:false};

test('preflight rejects unapproved, unallowlisted and private destinations', () => {
  assert.equal(preflight({...approved, approved:false},environment).allowed,false);
  assert.equal(preflight({...approved,url:'https://example.org'},environment).allowed,false);
  assert.equal(preflight({...approved,url:'http://scrapeme.live'},environment).allowed,false);
  assert.equal(preflight({...approved,url:'https://127.0.0.1/test'}, {...environment,allowedHosts:'127.0.0.1'}).allowed,false);
  assert.equal(preflight({...approved,url:'https://admin:s3cret@scrapeme.live'},environment).allowed,false);
  assert.equal(preflight({...approved,url:'https://scrapeme.live:8443'},environment).allowed,false);
});

test('write intent requires write approval and environment gate', () => {
  const r={...approved,scope:'write'};
  assert.equal(preflight(r,environment).allowed,false);
  assert.equal(preflight({...r,writeApproved:true},environment).allowed,false);
  assert.equal(preflight({...r,writeApproved:true},{...environment,writesEnabled:true}).allowed,true);
});

test('profile ID requires profile enabled and values validated', () => {
  assert.equal(preflight({...approved,profileId:'prof_1'},environment).allowed,false);
  assert.equal(preflight({...approved,useProfile:true,profileId:'prof_1'},environment).allowed,true);
  assert.equal(preflight({...approved,outputSchema:{type:'array'}},environment).allowed,false);
});

test('async request uses documented endpoint and never returns credential', async () => {
  const requests=[];
  const client=new TinyFishClient({apiKey:'secret-api-key', environment, transport:async (url,opts)=>{
    requests.push({url,opts});
    return {ok:true,json:async()=>({run_id:'run_123',error:null})};
  }});
  assert.deepEqual(await client.start(approved),{run_id:'run_123',error:null});
  assert.equal(requests[0].url,'https://agent.tinyfish.ai/v1/automation/run-async');
  assert.equal(requests[0].opts.headers['X-API-Key'],'secret-api-key');
  assert.equal(JSON.parse(requests[0].opts.body).url,approved.url);
  assert.equal(JSON.parse(requests[0].opts.body).goal,approved.goal);
});

test('run status and cancellation validate IDs and gate cancellation', async () => {
  const calls=[];
  const transport=async (url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({status:'COMPLETED'})};};
  const client=new TinyFishClient({apiKey:'abc',environment,transport});
  assert.deepEqual(await client.getRun('run_123'),{status:'COMPLETED'});
  assert.equal(calls[0].url,'https://agent.tinyfish.ai/v1/runs/run_123');
  await assert.rejects(()=>client.getRun('../etc/passwd'),/run_id/i);
  await assert.rejects(()=>client.cancel('run_123',{approved:false}),/approval/i);
  await client.cancel('run_123',{approved:true});
  assert.equal(calls[1].url,'https://agent.tinyfish.ai/v1/runs/run_123/cancel');
});

test('provider errors are redacted and no live request occurs without configuration', async () => {
  const client=new TinyFishClient({apiKey:'super-secret',environment,transport:async()=>({ok:false,status:401,json:async()=>({detail:'super-secret'})})});
  await assert.rejects(()=>client.start(approved),e=> e.message==='TinyFish HTTP 401');
  const disabled = new TinyFishClient({apiKey:'x',environment:{...environment,runsEnabled:false},transport:async()=>{throw Error('must not execute');}});
  await assert.rejects(()=>disabled.start(approved),/preflight/i);
});
