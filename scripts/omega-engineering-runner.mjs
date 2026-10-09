import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { getGitHubOidc, inference } from './thor-lovable-agent.mjs';
import { postComment } from './thor-copilot-worker.mjs';
import { parseTask, parseImplementation, stageFiles, executeSandbox, prompts, parseReview, sealEvidence, evidenceSummary } from './omega-engineering-kernel.mjs';

const max=(v,n)=>String(v??'').slice(0,n);

export async function engineerTask(event,{env=process.env,fetchImpl=fetch,tokenProvider=getGitHubOidc,runner=spawnSync,root=process.cwd(),askFn=null}={}){
  const task=parseTask(event);
  const token=askFn?undefined:await tokenProvider({env,fetchImpl});
  const runId=String(env.GITHUB_RUN_ID||'');
  const call=askFn||((role,prompt)=>inference(role,prompt,{fetchImpl,token,runId}));
  const plan=prompts(task);
  const design=await call('architect',plan.architecture);
  if(typeof design!=='string'||design.length<16)throw new Error('ARCHITECT_RESULT_INVALID');
  const imp=parseImplementation(await call('implementer',plan.implementation(design)),task.language);
  const artifact=stageFiles(task,imp,{root});
  const result=executeSandbox(artifact,{runner});
  const qa=parseReview(await call('qa-reviewer',plan.review(design,imp,result)),result);
  const ready=result.pass&&qa.decision==='PASS';
  const evidence=ready?sealEvidence(artifact,{result,qa,runId}):null;
  return {task,artifact,imp,result,qa,evidence,modelInvocations:3,ready};
}

export function publishVerified(out,{runner=spawnSync,env=process.env}={}){
  if(!out.ready)throw new Error('RELEASE_GATE_BLOCKED');
  const branch='omega/engineering-'+out.task.number;
  const commands=[
   ['git',['config','user.name','github-actions[bot]']],
   ['git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']],
   ['git',['switch','-c',branch]],
   ['git',['add','--',out.artifact.relative]],
   ['git',['commit','-m','feat(omega-engineering): verified '+out.task.language+' issue '+out.task.number]],
   ['git',['push','-u','origin',branch]],
  ];
  for(const [bin,args] of commands){
    const result=runner(bin,args,{shell:false,encoding:'utf8',timeout:70000,maxBuffer:500000,env});
    if(result.status!==0||result.error)throw new Error('PUBLISH_FAILED_'+bin+'_'+max(result.stderr||result.error?.message,180));
  }
  return branch;
}

export async function main(){
 if(!process.env.GITHUB_EVENT_PATH)throw Error('GITHUB_EVENT_PATH_REQUIRED');
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 const task=parseTask(event);
 try{
   const out=await engineerTask(event);
   if(!out.ready){
     await postComment(task.number,evidenceSummary({...out,branch:null})+'\n\n**BLOCKED: review or tests failed. No code published.**');
     process.exitCode=1;return;
   }
   const branch=publishVerified(out);
   const report=evidenceSummary({...out,branch})+'\n\nReview source: https://github.com/mojealterego/Agent-God-Level-Omega/compare/main...'+branch+'\n\nDraft PR must be opened by an owner-authorized connector; no automatic merge.';
   await postComment(task.number,report);
   console.log(JSON.stringify({task:task.number,language:task.language,agentCalls:3,tests:'PASS',qa:out.qa.decision,branch}));
 } catch(err){
   try{await postComment(task.number,'## THOR MULTILANGUAGE — BLOCKED\n\n'+max(err.message,350))}catch{};
   throw err;
 }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(max(error.message,320));process.exitCode=1});
