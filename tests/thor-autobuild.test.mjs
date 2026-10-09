import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBuildIssue,parseModelFiles,createArtifact,isolatedTests,generateAndTest} from '../scripts/thor-autobuild.mjs';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';
const e={repository:{full_name:'mojealterego/Agent-God-Level-Omega',owner:{login:'mojealterego'}},issue:{number:99,title:'[THOR-BUILD] Create hello string formatter',user:{login:'mojealterego'},body:'format a greeting'}};
const payload=JSON.stringify({source:'export function hello(name) { return \'Hello, \' + name; }',
 tests:"import test from 'node:test'; import assert from 'node:assert/strict'; import {hello} from './index.mjs'; test('greet',()=>assert.equal(hello('World'),'Hello, World')); test('blank',()=>assert.equal(hello(''),'Hello, '));",
 readme:'A small hello function.'});
test('owner only and bounded issue',()=>{assert.equal(validateBuildIssue(e).number,99);assert.throws(()=>validateBuildIssue({...e,issue:{...e.issue,user:{login:'x'}}}),/UNAUTHORIZED/);});
test('parse valid model JSON',()=>assert.equal(parseModelFiles(payload).source.includes('export'),true));
test('rejects missing independent tests',()=>assert.throws(()=>parseModelFiles(JSON.stringify({source:'export function alphabet(){return 1;}',
 tests:'function fake(){return true;}',
 readme:'x'})),/BAD_CODE_LENGTHS|TEST_CONTRACT_MISSING/));
test('rejects malicious code side effects',()=>assert.throws(()=>parseModelFiles(payload.replace('export function','export const fromChild = process.env.SECRET; export function')),/DISALLOWED_SIDE_EFFECT/));
test('artifact written to isolated issue path',()=>{const root=mkdtempSync(join(tmpdir(),'omega-test-'));try{const a=createArtifact(validateBuildIssue(e),parseModelFiles(payload),{base:root});assert.match(a.relative,/issue-99/);assert.match(readFileSync(join(a.destination,'index.mjs'),'utf8'),/hello/);}finally{rmSync(root,{recursive:true,force:true})}});
test('sandbox test command has no network, readonly filesystem and no token',()=>{const a={destination:'/tmp/secure'};const r=isolatedTests(a,{runner:(_bin,args,opts)=>{assert(args.includes('none'));assert(args.includes('--read-only'));assert(!opts.env.GITHUB_TOKEN);return{status:0,stdout:'pass 2',stderr:''}}});assert.equal(r.ok,true);});
test('3 live calls, generates real files and runs independent test',async()=>{const root=mkdtempSync(join(tmpdir(),'omega-build-'));let i=0;try{const z=await generateAndTest(e,{env:{GITHUB_RUN_ID:'77'},base:root,tokenProvider:async()=> 'jwt.here.sig',
fetchImpl:async(_,opts)=>{const body=JSON.parse(opts.body);i++;const content=body.agentRole==='architect'?'Minimum valid architect specification.':body.agentRole==='implementer'?payload:'Independent QA: observed tests passed.';return{ok:true,status:200,text:async()=>JSON.stringify({ok:true,role:body.agentRole,provider:'lovable-ai',content})}},
runner:()=>({status:0,stdout:'test pass',stderr:''})});assert.equal(z.realAgentCalls,3);assert.equal(i,3);assert.equal(z.tested.ok,true);}finally{rmSync(root,{recursive:true,force:true})}});
