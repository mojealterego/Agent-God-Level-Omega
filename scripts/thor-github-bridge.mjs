import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ThorOrchestrator, AgentDirectory } from '../omega/mcp/omega-control-plane/src/asgard/asgard-architecture.mjs';

const ALLOWED_KEYS = new Set(['goal','deliverables','constraints','requiredCapabilities','priority']);
const isTextArray = (values, max) => Array.isArray(values) && values.length <= max && values.every(v => typeof v === 'string' && v.length > 0 && v.length <= 240);

export function approvedIssue(event) {
  const owner = event?.repository?.owner?.login;
  const sender = event?.issue?.user?.login;
  return owner === 'mojealterego' && sender === owner && String(event?.issue?.title ?? '').startsWith('[THOR] ') && Number.isSafeInteger(event?.issue?.number);
}

export function parseRequest(event) {
  if (!approvedIssue(event)) throw new Error('Unauthorized or malformed THOR issue');
  const body = String(event.issue.body ?? '');
  if (body.length > 12000) throw new Error('Task body too large');
  const match = /```omega-task\s*\n([\s\S]*?)\n```/.exec(body);
  const raw = match ? JSON.parse(match[1]) : {goal: event.issue.title.slice(7).trim()};
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error('Task must be an object');
  for (const key of Object.keys(raw)) if (!ALLOWED_KEYS.has(key)) throw new Error(`Unsupported task field: ${key}`);
  if (typeof raw.goal !== 'string' || raw.goal.trim().length < 3 || raw.goal.length > 1600) throw new Error('Invalid goal');
  const data = {goal:raw.goal.trim(), deliverables:raw.deliverables??[],constraints:raw.constraints??[],requiredCapabilities:raw.requiredCapabilities??null,priority:raw.priority??'NORMAL'};
  if (!isTextArray(data.deliverables,20) || !isTextArray(data.constraints,20)) throw new Error('Invalid task lists');
  if (data.requiredCapabilities!==null && !isTextArray(data.requiredCapabilities,20)) throw new Error('Invalid capabilities');
  if (!['NORMAL','HIGH','URGENT'].includes(data.priority)) throw new Error('Invalid priority');
  return data;
}

function safeExec(binary, args, cwd) {
  const result = spawnSync(binary,args,{cwd,encoding:'utf8',timeout:120000,maxBuffer:2_000_000,shell:false,env:{...process.env,FORCE_COLOR:'0'}});
  return {ok:!result.error&&result.status===0,evidence:`${binary} ${args.join(' ')}:exit=${result.status??'ERROR'}`,output:String(result.stderr??'').slice(-650),error:result.error?.message??null};
}

export async function systemCheck(kind,{cwd=process.cwd()}={}) {
  if (kind==='quality-gate') return safeExec(process.execPath,['--test','tests/thor-github-bridge.test.mjs'],cwd);
  if (kind==='repo-intelligence') return safeExec('git',['rev-parse','--verify','HEAD'],cwd);
  if (kind==='security-audit') {
    const root=join(cwd,'.github','workflows');
    const issues=[];
    for(const name of readdirSync(root).filter(x=>/\.ya?ml$/.test(x))){
      const s=readFileSync(join(root,name),'utf8');
      if(/\bpull_request_target\s*:/.test(s)) issues.push(`${name}:pull_request_target`);
      if(/\bpermissions:\s*write-all\b/.test(s)) issues.push(`${name}:write-all`);
      if(/(?:curl|wget)[^\n]*\|\s*(?:sh|bash)\b/.test(s)) issues.push(`${name}:remote-shell`);
    }
    return {ok:issues.length===0,evidence:`workflow-static-audit:issues=${issues.length}`,output:issues.join(', ').slice(0,1000)};
  }
  throw new Error('Invalid check kind');
}

const REGISTERED_CHECKS = new Map([
  ['quality-gate','quality-gate'],
  ['repo-intelligence','repo-intelligence'],
  ['secret-governance','security-audit']
]);

export async function executeIssue(event,{check=systemCheck}={}) {
  const data=parseRequest(event);
  const orchestrator = new ThorOrchestrator({directory:new AgentDirectory()});
  const task=orchestrator.submit(data);
  const assignments=orchestrator.assign(task.id);
  for(const item of assignments){
    const checkKind=REGISTERED_CHECKS.get(item.capability);
    if (!checkKind){
      orchestrator.update(task.id,{subtaskId:item.subtaskId,status:'BLOCKED',result:{reason:'NO_EXECUTION_ADAPTER',agent:item.agent,capability:item.capability}});
      continue;
    }
    try{
      const outcome=await check(checkKind);
      orchestrator.update(task.id,{subtaskId:item.subtaskId,status:outcome.ok?'DONE':'FAILED',result:{ok:outcome.ok,output:outcome.output??'',error:outcome.error??null},evidence:[outcome.evidence]});
    }catch(error){
      orchestrator.update(task.id,{subtaskId:item.subtaskId,status:'FAILED',result:{error:String(error?.message??error)}});
    }
  }
  const completion=orchestrator.finalize(task.id,{summary:'Verified GitHub Actions THOR execution',product:'CI evidence'});
  const current=orchestrator.get(task.id);
  return {finalized:completion.done===true,blockers:completion.blockers??[],assignments,task:current,sourceIssue:event.issue.number,implementation:'github-actions-asgard-existing-orchestrator',modelWorkersLaunched:0};
}

function briefComment(result) {
  const state=result.finalized?'DONE':'BLOCKED/FAILED';
  const rows=result.task.subtasks.map(x=>`| \`${x.agent}\` | \`${x.capability}\` | ${x.status} | ${(x.evidence||[]).join(', ').replaceAll('|','/').slice(0,120)} |`);
  return [`### THOR — ${state}`,'',`Task: \`${result.task.id}\``,`Run: \`${process.env.GITHUB_RUN_ID??'local'}\``,
    '', '| Agent | Capability | Status | Evidence |','|---|---|---|---|',...rows,'',
    result.finalized?'Verification succeeded for all requested capabilities.':'Unimplemented agent capabilities remain BLOCKED; no fabricated completion.',
    '',`Registered worker processes: ${result.modelWorkersLaunched}; this is a deterministic ASGARD/CI bridge, not an LLM worker farm.`].join('\n').slice(0,14000);
}

async function postGitHubIssueComment(event, body) {
  const repo=event.repository.full_name;
  if(repo!=='mojealterego/Agent-God-Level-Omega') throw new Error('Unexpected repository');
  const token=process.env.GITHUB_TOKEN;
  if(!token)throw new Error('GITHUB_TOKEN not provided');
  const url=`https://api.github.com/repos/${repo}/issues/${event.issue.number}/comments`;
  const response=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${token}`,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({body})});
  if(!response.ok)throw new Error(`GitHub comment error ${response.status}`);
}

async function main(){
  const path=process.env.GITHUB_EVENT_PATH;
  if(!path)throw new Error('GITHUB_EVENT_PATH missing');
  const event=JSON.parse(readFileSync(path,'utf8'));
  if(!approvedIssue(event))throw new Error('Not an authorized owner THOR issue');
  try{
    const result=await executeIssue(event);
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
    await postGitHubIssueComment(event,briefComment(result));
    if(!result.finalized)process.exitCode=1;
  } catch(error){
    const report=`### THOR — FAILED\n\nRunner error: ${String(error?.message??error).slice(0,500)}`;
    await postGitHubIssueComment(event,report);
    throw error;
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error);process.exitCode=1;});
}
