import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AsgardRuntime } from '../src/asgard/asgard-runtime.mjs';

async function root(){return await mkdtemp(join(tmpdir(),'omega-v18-'));}

test('runtime registers and lists isolated account profiles',async()=>{
 const r=new AsgardRuntime({root:await root(),env:{}});
 await r.action({action:'account-register',payload:{id:'gem-1',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,secretEnvRef:'G1',capabilities:['research']}});
 await r.action({action:'account-register',payload:{id:'chat-1',provider:'CHATGPT',transport:'HOST_PROFILE',authorized:true,profileRef:'primary'}});
 const list=await r.action({action:'account-list',payload:{}}); assert.equal(list.length,2); assert.equal(JSON.stringify(list).includes('secret-value'),false);
});

test('Gemini selected account uses its own env key and never returns it',async()=>{
 const seen=[]; const env={G1:'KEY_ONE_SECRET',G2:'KEY_TWO_SECRET'};
 const fetchImpl=async(url,opts)=>{seen.push({url,headers:opts.headers,body:opts.body});return new Response(JSON.stringify({id:'ix1',status:'completed',output_text:'ok'}),{status:200,headers:{'content-type':'application/json'}})};
 const r=new AsgardRuntime({root:await root(),env,fetchImpl});
 await r.action({action:'account-register',payload:{id:'gem-2',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,secretEnvRef:'G2',capabilities:['research'],health:'HEALTHY'}});
 const out=await r.action({action:'ivar-gemini-start',payload:{input:'test',mode:'model',accountId:'gem-2'}});
 assert.equal(out.accountId,'gem-2'); assert.equal(seen[0].headers['x-goog-api-key'],'KEY_TWO_SECRET'); assert.equal(JSON.stringify(out).includes('KEY_TWO_SECRET'),false);
});

test('GitHub doctor injects profile-specific GH_CONFIG_DIR',async()=>{
 const calls=[]; const r=new AsgardRuntime({root:await root(),env:{},commandRunner:async c=>{calls.push(c);return {exitCode:0,stdout:'tester\n',stderr:''};}});
 await r.action({action:'account-register',payload:{id:'gh-3',provider:'GITHUB',transport:'GH_CONFIG_DIR',authorized:true,profileRef:'/secure/gh-3',health:'HEALTHY'}});
 const out=await r.action({action:'thor-github-doctor',payload:{accountId:'gh-3'}}); assert.equal(out.ready,true); assert.equal(calls.every(c=>c.env.GH_CONFIG_DIR==='/secure/gh-3'),true);
});

test('persisted ASGARD v18 state contains refs but not secret values',async()=>{
 const dir=await root(); const r=new AsgardRuntime({root:dir,env:{G1:'VERY_SECRET_GEMINI_KEY'}});
 await r.action({action:'account-register',payload:{id:'gem-1',provider:'GEMINI',transport:'ENV_API_KEY',authorized:true,secretEnvRef:'G1',health:'HEALTHY'}});
 const save=await r.action({action:'state-save',payload:{}}); const raw=await readFile(save.path,'utf8'); assert.match(raw,/"version": 21/); assert.match(raw,/"secretEnvRef": "G1"/); assert.equal(raw.includes('VERY_SECRET_GEMINI_KEY'),false);
});
