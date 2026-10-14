// Android-safe bridge for an already-paired, locally authorized phone.
// The existing ChatGPT GitHub connector writes a task to the *owner-controlled*
// main branch. No MCP client support in the ChatGPT Android host is required.
//
// Only fixed read-only diagnostics are accepted here. Other operations must use
// the authenticated MCP endpoint and existing on-device policy/consent gates.
import { classifyCommand } from './phone-terminal.mjs';

// Always read main: a pinned commit silently freezes the queue after one task.
// GitHub main is protected by the repository's own write permissions.
const SOURCE_URL = 'https://raw.githubusercontent.com/mojealterego/Agent-God-Level-Omega/main/' +
  'services/omega-termux-knowledge-relay/queue/command.json';
const API_URL = 'https://api.github.com/repos/mojealterego/Agent-God-Level-Omega/contents/' +
  'services/omega-termux-knowledge-relay/queue/command.json';

const ALLOWED_BINARIES = new Set([
  'pwd','ls','head','tail','wc','stat','sha256sum','git','openssl',
  'node','python3','npm','pkg','apt','cargo','rustc'
]);
const SENSITIVE = /(^|\/)(\.config|\.ssh|\.gnupg|\.aws|\.npmrc|\.netrc|relay_agent_token|id_ed25519|runtime_api_key)(\/|$)|--?(token|password|secret|api[_-]?key|authorization|credential)/i;
function failure(msg) { throw new Error('REPO_JOB_INVALID: ' + msg); }

export function validateTask(value, now = Date.now()) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) failure('not_an_object');
  const {id, issuedAt, method, params} = value;
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{8,64}$/.test(id)) failure('id');
  if (typeof issuedAt !== 'string') failure('issuedAt');
  const timestamp = Date.parse(issuedAt);
  if (!Number.isFinite(timestamp) || timestamp > now + 60_000 || now - timestamp > 180_000) failure('expired');
  if (method === 'terminal.status' || method === 'knowledge.info') return {id, method, params:{}};
  if (method !== 'terminal.run') failure('method');
  if (!params || !Array.isArray(params.argv) || params.argv.length < 1 || params.argv.length > 32 ||
      !params.argv.every(x => typeof x === 'string' && x.length > 0 && x.length <= 512 && !/[\r\n\0]/.test(x))) failure('argv');
  if (!ALLOWED_BINARIES.has(params.argv[0])) failure('executable_not_allowlisted');
  if (params.argv.some(x => SENSITIVE.test(x))) failure('sensitive_argv');
  if (params.argv.slice(1).some(x => x.includes('..') || x.startsWith('/') || x.startsWith('~'))) failure('unsafe_argument_path');
  if (params.argv.slice(1).some(x => /^(-e|-p|-c|--eval|--print|--input-type)$/.test(x))) failure('inline_code_forbidden');
  if (!['R','L'].includes(params.sideEffect)) failure('sideEffect');
  const cwd = params.cwd ?? '.';
  if (typeof cwd !== 'string' || cwd.length > 200 || cwd.startsWith('/') || cwd.includes('..') ||
      cwd.startsWith('~') || SENSITIVE.test(cwd)) failure('cwd');
  let actualEffect;
  try { actualEffect = classifyCommand(params.argv); }
  catch { failure('device_policy_denies_command'); }
  if (actualEffect !== params.sideEffect) failure('side_effect_mismatch');
  return {id,method,params:{
    argv:params.argv,cwd,sideEffect:params.sideEffect,
    timeoutMs:Math.min(30000, Math.max(1000, Number(params.timeoutMs)||10000)),
    maxOutputBytes:Math.min(8192,Math.max(256,Number(params.maxOutputBytes)||2048))
  }};
}

export function createRepoQueueWorker({ fetchTask, run, log = console.log }) {
  const doneIds = new Set();
  let lastRejected = null, busy = false;
  return {
    async tick() {
      if (busy) return;
      busy = true;
      let raw = null, task = null;
      try {
        raw = await fetchTask();
        if (!raw) return;
        task = validateTask(raw);
        if (doneIds.has(task.id)) return;
        const result = await run(task.method, task.params);
        lastDone = task.id;
        log('OMEGA_REPO_JOB_RESULT ' + JSON.stringify({id:task.id,ok:true,result}).slice(0,4096));
      } catch(error) {
        const msg = String(error?.message || error).slice(0,180);
        if (msg.startsWith('REPO_JOB_INVALID')) {
          const marker = String(raw?.id ?? 'unknown').slice(0,80)+'|'+msg;
          if (marker !== lastRejected) {
            lastRejected = marker;
            log('OMEGA_REPO_JOB_REJECTED ' + JSON.stringify({id:typeof raw?.id === 'string' ? raw.id.slice(0,80) : null,reason:msg}));
          }
        } else if (task && /Remote terminal disabled|TERMINAL_POLICY_DENIED|arm it locally in Termux/i.test(msg)) {
          lastDone = task.id;
          log('OMEGA_REPO_JOB_RESULT ' + JSON.stringify({id:task.id,ok:false,error:'consent_required'}));
        } else {
          // Transport errors are transient. Keep the task retryable.
          log('OMEGA_REPO_JOB_ERROR ' + msg);
        }
      } finally {
        busy = false;
      }
    }
  };
}

// GitHub's raw branch edge can serve an old main ref even with cache busting.
// Cross-check latest contents through the REST API at most 48 times/hour
// (anonymous public API limit is 60/hour). Prefer the newest issuedAt.
export function startRepoQueueBridge({run, log=console.log, intervalMs=12000}) {
  let lastApiAt = 0;
  let latestApiTask = null;
  const jobUrl = SOURCE_URL;
  async function requestText(url, headers) {
    const ac = new AbortController();
    const timeout = setTimeout(()=>ac.abort(),4500);
    try {
      const response = await fetch(url, {signal:ac.signal,redirect:'error',
        cache:'no-store',headers});
      if(response.status===404) return null;
      if(!response.ok) throw new Error('github_http_'+response.status);
      const content=await response.text();
      if(content.length>5000) throw new Error('github_body_too_large');
      return content;
    } finally {clearTimeout(timeout);}
  }
  const worker=createRepoQueueWorker({
    run,log,
    fetchTask:async()=>{
      let rawTask=null, lastError=null;
      try {
        const raw=await requestText(jobUrl+'?nocache='+Date.now(),
          {accept:'application/json','user-agent':'omega-termux-repo-worker'});
        if(raw) rawTask=JSON.parse(raw);
      } catch(e) {lastError=e;}
      const now=Date.now();
      if(now-lastApiAt>=75000 || lastApiAt===0){
        lastApiAt=now;
        try {
          const payload=await requestText(API_URL+'?ref=main&nocache='+now,
            {accept:'application/vnd.github+json','user-agent':'omega-termux-repo-worker',
             'x-github-api-version':'2022-11-28'});
          if(payload){
            const o=JSON.parse(payload);
            if(o.encoding!=='base64' || typeof o.content!=='string')
              throw new Error('github_api_invalid_encoding');
            const json=Buffer.from(o.content.replace(/\s+/g,''),'base64').toString('utf8');
            if(json.length>2048) throw new Error('github_api_task_too_large');
            latestApiTask=JSON.parse(json);
          }
        } catch(e) {lastError=e;}
      }
      const apiTime=Date.parse(latestApiTask?.issuedAt??'')||0;
      const rawTime=Date.parse(rawTask?.issuedAt??'')||0;
      const newest=apiTime>=rawTime ? (latestApiTask??rawTask) : rawTask;
      if(!newest && lastError) throw lastError;
      return newest;
    }
  });
  const timer=setInterval(()=>worker.tick(),intervalMs);
  timer.unref?.();
  setTimeout(()=>worker.tick(),1500).unref?.();
  return worker;
}
