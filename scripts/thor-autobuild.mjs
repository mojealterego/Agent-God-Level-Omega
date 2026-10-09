import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { getGitHubOidc, inference } from './thor-lovable-agent.mjs';
import { postComment, REPO } from './thor-copilot-worker.mjs';

const TAG = '[THOR-BUILD] ';
const ROOT = resolve(process.cwd());
const ALLOWED_TEST_IMAGE = 'node:22-alpine';
const max = (v,n)=>String(v??'').slice(0,n);

export function validateBuildIssue(event) {
  if(event?.repository?.full_name!==REPO || event?.repository?.owner?.login!=='mojealterego' ||
     event?.issue?.user?.login!=='mojealterego' || !Number.isSafeInteger(event.issue.number) ||
     !String(event.issue.title).startsWith(TAG)) throw new Error('UNAUTHORIZED_BUILD_ISSUE');
  const goal = event.issue.title.slice(TAG.length).trim();
  const detail = String(event.issue.body??'').trim();
  if(goal.length<6||goal.length>200||detail.length>3000)throw new Error('INVALID_BUILD_REQUEST');
  return {number:event.issue.number, goal, detail, root:'experiments/omega-generated/issue-'+event.issue.number};
}

export function parseModelFiles(raw) {
  const text = String(raw??'').trim().replace(/^\\s*\\x60\\x60\\x60(?:json)?\\s*/i,'').replace(/\\x60\\x60\\x60\\s*$/,'');
  const first=text.indexOf('{'), last=text.lastIndexOf('}');
  if(first<0||last<=first)throw new Error('MISSING_CODE_JSON');
  let v;
  try{v=JSON.parse(text.slice(first,last+1));}catch{throw new Error('INVALID_CODE_JSON');}
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['source','tests','readme'].includes(k)))throw new Error('UNEXPECTED_CODE_FIELDS');
  if(typeof v.source!=='string'||v.source.length<40||v.source.length>8000 || typeof v.tests!=='string'||v.tests.length<80||v.tests.length>5200)throw new Error('BAD_CODE_LENGTHS');
  if(typeof v.readme!=='string'||v.readme.length>1200)throw new Error('BAD_README');
  if(!v.tests.includes("node:test")||!v.tests.includes('assert')||!v.tests.includes('./index.mjs'))throw new Error('TEST_CONTRACT_MISSING');
  if(/\\b(?:execSync|spawnSync|child_process|process\\.env|fetch\\s*\\(|https?\\.request)\\b/.test(v.source+'\n'+v.tests))throw new Error('DISALLOWED_SIDE_EFFECT');
  return v;
}

export function createArtifact(issue, files,{base=ROOT}={}) {
  const destination=join(base,issue.root);
  mkdirSync(destination,{recursive:true});
  writeFileSync(join(destination,'index.mjs'),files.source,{flag:'wx',mode:0o644});
  writeFileSync(join(destination,'test.mjs'),files.tests,{flag:'wx',mode:0o644});
  writeFileSync(join(destination,'README.md'),'# OMEGA generated task #'+issue.number+'\n\n'+files.readme+'\n',{flag:'wx',mode:0o644});
  return {destination,relative:issue.root};
}

export function isolatedTests(artifact,{runner=spawnSync,timeout=100000}={}) {
  const args=['run','--rm','--network','none','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges',
    '--memory=256m','--cpus=1','--pids-limit=64','--user','1000:1000',
    '-v',artifact.destination+':/work:ro','-w','/work',ALLOWED_TEST_IMAGE,'node','--test','test.mjs'];
  const res=runner('docker',args,{encoding:'utf8',shell:false,timeout,maxBuffer:2_000_000,env:{PATH:process.env.PATH,HOME:process.env.HOME}});
  return {ok:res.status===0&&!res.error,exitCode:res.status,stdout:max(res.stdout,2500),stderr:max(res.stderr??res.error?.message,800),sandbox:'docker-network-none',image:ALLOWED_TEST_IMAGE};
}

export function buildPrompts(issue) {
  const architect='You are OMEGA architect. Work item: '+issue.goal+'. Details: '+issue.detail+
    '. Design a MINIMAL single-file dependency-free Node.js 22 ESM module with exports and acceptance criteria that can actually pass tests. Strict max 400 words. Do NOT invent build evidence.';
  return {architect};
}

export async function generateAndTest(event,{fetchImpl=fetch,env=process.env,runner=spawnSync,tokenProvider=getGitHubOidc,base=ROOT}={}) {
 const issue=validateBuildIssue(event);
 const token=await tokenProvider({fetchImpl,env});
 const runId=String(env.GITHUB_RUN_ID??'');
 const call=(role,prompt)=>inference(role,prompt,{fetchImpl,token,runId});
 const arch=await call('architect',buildPrompts(issue).architect);
 const implPrompt='You are OMEGA implementer. Task: '+issue.goal+'; architect: '+max(arch,1100)+
  '. Return ONLY valid minified JSON with three keys: source (JavaScript ESM implementing behavior), tests (node:test + node:assert/strict tests importing ./index.mjs), readme (one short paragraph). No markdown, no explanation outside JSON. Code must be fully executable, simple, dependency-free, include at least 2 meaningful tests. Prefer implementation under 2400 chars, tests under 1600 chars. Task details: '+max(issue.detail,1000);
 const impl=await call('implementer',implPrompt);
 const files=parseModelFiles(impl);
 const artifact=createArtifact(issue,files,{base});
 const tested=isolatedTests(artifact,{runner});
 const qaPrompt='You are independent OMEGA QA. Verify task: '+issue.goal+'; architecture: '+max(arch,650)+
    '; generated source: '+max(files.source,1800)+'; tests: '+max(files.tests,1000)+
    '; actual sandboxed test result: '+JSON.stringify(tested)+
    '. Identify defects or missing requirements, distinguish test execution from assumptions. Respond with concise QA findings.';
 const review=await call('qa-reviewer',qaPrompt);
 return {issue,artifact,tested,review,realAgentCalls:3,generated:files,stage:'MODEL_EXECUTED_TESTED'};
}

export function reportOutcome(out) {
 return ['## OMEGA THOR — AUTOBUILD', '', 'Live model calls: '+out.realAgentCalls,
  'Sandbox: '+out.tested.sandbox, 'Tests: '+(out.tested.ok?'PASS':'FAIL'),
  'Artifact: '+out.artifact.relative,
  'Code stored for review, NOT merged into main.',
  '', '### Independent QA',max(out.review,3500),
  '', '### Observed test output','\x60\x60\x60',max(out.tested.stdout+'\n'+out.tested.stderr,2000),'\x60\x60\x60'].join('\n').slice(0,12000);
}

export async function main(){
 if(!process.env.GITHUB_EVENT_PATH)throw new Error('EVENT_PATH_MISSING');
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const issue=validateBuildIssue(event);
 try {
   const result=await generateAndTest(event);
   if(!result.tested.ok){
     await postComment(issue.number,reportOutcome(result)+'\n\n**BLOCKED: tests failed; no branch or PR was created.**');
     process.exitCode=1;return;
   }
   const branch='omega/agent-build-'+issue.number;
   const cmds=[
     ['git',['config','user.name','github-actions[bot]']],
     ['git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']],
     ['git',['switch','-c',branch]],
     ['git',['add','--',result.artifact.relative]],
     ['git',['commit','-m','feat(omega): verified generated artifact for issue '+issue.number]],
     ['git',['push','-u','origin',branch]],
     ['gh',['pr','create','--base','main','--head',branch,'--title','OMEGA validated artifact for issue #'+issue.number,
       '--body','Automated OMEGA model pipeline: 3 live model calls, bounded Docker tests passed. Review required. Source: #'+issue.number]]
   ];
   let prOutput='';
   for(const [bin,args] of cmds){
     const cmd=spawnSync(bin,args,{encoding:'utf8',shell:false,timeout:60000,maxBuffer:1000000,env:process.env});
     if(cmd.status!==0||cmd.error)throw new Error('PUBLISH_FAILED_'+bin+'_'+max(cmd.stderr??cmd.error?.message,300));
     if(bin==='gh')prOutput=cmd.stdout.trim();
   }
   await postComment(issue.number,reportOutcome(result)+'\n\nPull request: '+prOutput);
   process.stdout.write(JSON.stringify({issue:issue.number,status:'PR_OPENED',url:prOutput,modelCalls:3,tests:'PASS'})+'\n');
 } catch(err){
   await postComment(issue.number,'## THOR AUTOBUILD — BLOCKED\n\n'+max(err.message,480));
   throw err;
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(err=>{console.error(err.message);process.exitCode=1;});
