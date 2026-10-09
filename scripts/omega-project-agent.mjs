import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { scaffold, validateSpec } from './omega-project-factory.mjs';
import { getGitHubOidc, inference } from './thor-lovable-agent.mjs';
import { postComment, REPO } from './thor-copilot-worker.mjs';

const PREFIX='[THOR-PROJECT] ';
export function parseProjectIssue(event){
 if(event?.repository?.full_name!==REPO || event.repository?.owner?.login!=='mojealterego' || event?.issue?.user?.login!=='mojealterego' || !Number.isSafeInteger(event.issue?.number))throw new Error('PROJECT_ISSUE_UNAUTHORIZED');
 const title=String(event.issue.title??'');
 if(!title.startsWith(PREFIX))throw new Error('PROJECT_TITLE_PREFIX');
 const match=/^(web|game|android|api)\s+([a-z][a-z0-9-]{2,30})$/.exec(title.slice(PREFIX.length).trim());
 if(!match)throw new Error('PROJECT_EXPECTED_KIND_AND_SLUG');
 const details=String(event.issue.body??'').trim();
 if(!details || details.length>2700)throw new Error('PROJECT_DETAILS_BOUNDS');
 return {kind:match[1],slug:match[2],details,number:event.issue.number};
}

export function parseDesign(raw,issue){
 const source=String(raw??'').trim();
 const start=source.indexOf('{'),end=source.lastIndexOf('}');
 if(start<0||end<=start)throw new Error('MODEL_DESIGN_INVALID_JSON');
 let design;
 try{design=JSON.parse(source.slice(start,end+1))}catch{throw new Error('MODEL_DESIGN_INVALID_JSON')}
 if(!design||Array.isArray(design)||typeof design!=='object'||Object.keys(design).some(x=>!['title','description','accent'].includes(x)))throw new Error('MODEL_DESIGN_UNEXPECTED_FIELDS');
 return validateSpec({kind:issue.kind,slug:issue.slug,...design});
}

export function verifyScaffold(spec,artifact,{runner=spawnSync}={}){
 if(spec.kind==='android'){
  const manifest=resolve(artifact.target,'app/src/main/AndroidManifest.xml');
  const ok=existsSync(manifest);
  return {status:ok?'ANDROID_SOURCE_READY_APK_UNVERIFIED':'ANDROID_SOURCE_MISSING',pass:ok,command:'static manifest check',apkVerified:false,exitCode:ok?0:1,log:ok?'Android native source and manifest generated. APK not built.':''};
 }
 const r=runner('node',['--test',...spec.kind==='api'?['server.test.mjs']:spec.kind==='game'?['physics.test.mjs','server.test.mjs']:['core.test.mjs','server.test.mjs']],{cwd:artifact.target,encoding:'utf8',timeout:45000,env:{PATH:process.env.PATH,HOME:process.env.HOME,CI:'true'}});
 const pass=r.status===0&&!r.error&&/# fail 0/.test(String(r.stdout));
 return {status:pass?'TESTED':'TEST_FAILED',pass,command:'node --test',apkVerified:false,exitCode:r.status,log:String(r.stdout??r.stderr??'').slice(-4500)};
}

export async function agentProject(event,{env=process.env,fetchImpl=fetch,tokenProvider=getGitHubOidc,runner=spawnSync,base=process.cwd()}={}){
 const issue=parseProjectIssue(event);
 const token=await tokenProvider({env,fetchImpl});
 const runId=String(env.GITHUB_RUN_ID??'');
 const ask=(role,prompt)=>inference(role,prompt,{fetchImpl,token,runId});
 const architect=await ask('architect',`OMEGA ${issue.kind.toUpperCase()} technical architect. Create a compact architecture and acceptance criteria for '${issue.details}'. Assume templates produce runnable code; do not fabricate tests. Max 250 words.`);
 const proposed=await ask('implementer',`OMEGA ${issue.kind.toUpperCase()} product/design engineer. User brief: ${issue.details}. Previous architecture: ${architect.slice(0,700)}. Return only minified JSON with keys title (2-80 chars, no HTML), description (1-180 chars, no HTML), accent (six-digit hex color e.g. #38bdf8). No code or other keys. This metadata will safely configure deterministic working project templates.`);
 const spec=parseDesign(proposed,issue);
 const target=resolve(base,'experiments/omega-projects/issue-'+issue.number+'-'+issue.slug);
 const artifact=scaffold(spec,{out:target});
 const verified=verifyScaffold(spec,artifact,{runner});
 const audit=await ask('qa-reviewer',`Independent QA for ${issue.kind} project '${spec.title}'. Requirements: ${issue.details.slice(0,700)}. Trusted automated verification: ${JSON.stringify(verified).slice(0,2000)}. Note all missing checks. NEVER claim Android APK tests if apkVerified=false. Max 250 words.`);
 const receipt={schema:'omega.project-run.v1',issue:issue.number,runId,kind:issue.kind,slug:issue.slug,modelCalls:3,sourceRoot:'experiments/omega-projects/issue-'+issue.number+'-'+issue.slug,files:artifact.fileCount,validation:verified,qaSummary:audit.slice(0,1200),requiresHumanReview:true,merged:false};
 writeFileSync(resolve(target,'omega-run-receipt.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
 return {issue,artifact,spec,verified,audit,receipt};
}

export async function publishReview(result,{runner=spawnSync,env=process.env}={}){
 if(!result.verified.pass)throw new Error('BUILD_GATES_FAILED');
 const branch='omega/project-'+result.issue.number;
 const commands=[['git',['config','user.name','github-actions[bot]']],['git',['config','user.email','41898282+github-actions[bot]@users.noreply.github.com']],['git',['switch','-c',branch]],['git',['add','--',result.receipt.sourceRoot]],['git',['commit','-m','feat(omega): generated '+result.spec.kind+' project for issue '+result.issue.number]],['git',['push','-u','origin',branch]]];
 for(const [bin,args] of commands){const r=runner(bin,args,{shell:false,encoding:'utf8',timeout:65000,maxBuffer:100000,env});if(r.status!==0||r.error)throw new Error('PUBLISH_FAILED_'+bin+'_'+String(r.stderr??r.error?.message??'').slice(0,240));}
 return {branch,compare:'https://github.com/'+REPO+'/compare/main...'+branch};
}

export async function main(){
 if(!process.env.GITHUB_EVENT_PATH)throw Error('MISSING_ACTIONS_EVENT');
 const event=JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
 let number;try{number=parseProjectIssue(event).number;const r=await agentProject(event);const pub=await publishReview(r);await postComment(number,`## OMEGA ${r.spec.kind.toUpperCase()} project source generated\n\n**Real model invocations:** 3\n**Actual test result:** ${r.verified.status}\n**APK built:** ${r.verified.apkVerified}\n**Files:** ${r.artifact.fileCount}\n**Branch:** ${pub.branch}\n**Compare:** ${pub.compare}\n\nIndependent QA: ${r.audit.slice(0,1200)}\n\nManual review and PR required; no automatic merge.\n`);console.log(JSON.stringify({result:'SOURCE_GENERATED',issue:number,branch:pub.branch,verification:r.verified.status}));}catch(e){if(number)await postComment(number,'## OMEGA PROJECT — BLOCKED\n\n'+String(e.message).slice(0,380));throw e}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1});
