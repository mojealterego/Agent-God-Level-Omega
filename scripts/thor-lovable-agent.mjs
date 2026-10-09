import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execute, AGENTS, parseRequest, issueReport, postComment, REPO } from './thor-copilot-worker.mjs';

export const INFER_URL = 'https://omega-inference-runtime.lovable.app/api/public/omega-github-infer';
export const TAG = '[THOR-LOVABLE] ';
const audience = 'omega-agent-runtime';

export function validateEvent(event) {
  if (!String(event?.issue?.title ?? '').startsWith(TAG)) throw new Error('NOT_THOR_LOVABLE_ISSUE');
  const virtual = { ...event, issue: { ...event.issue, title: '[THOR-COPILOT] ' + event.issue.title.slice(TAG.length) } };
  parseRequest(virtual);
  return virtual;
}

export async function getGitHubOidc({ fetchImpl = fetch, env = process.env } = {}) {
  const uri = env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const bearer = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!uri || !bearer || !/^https:\/\//.test(uri)) throw new Error('ACTIONS_OIDC_UNAVAILABLE');
  const url = new URL(uri);
  url.searchParams.set('audience', audience);
  const res = await fetchImpl(url, {headers: {Authorization: 'Bearer ' + bearer}, signal: AbortSignal.timeout(10000)});
  if (!res.ok) throw new Error('ACTIONS_OIDC_REJECTED_' + res.status);
  const payload = await res.json();
  if (typeof payload.value !== 'string' || payload.value.split('.').length !== 3) throw new Error('INVALID_ACTIONS_OIDC');
  return payload.value;
}

export async function inference(role, prompt, { fetchImpl = fetch, token, runId, endpoint = INFER_URL } = {}) {
  if (!AGENTS.some(x => x.id === role)) throw new Error('ROLE_UNAUTHORIZED');
  if (!token || !runId || !/^\d{1,20}$/.test(runId)) throw new Error('INFERENCE_IDENTITY_MISSING');
  if (prompt.length > 6000) throw new Error('PROMPT_TOO_LONG');
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', Accept: 'application/json'},
    body: JSON.stringify({agentRole: role, prompt, runId}),
    signal: AbortSignal.timeout(70000)
  });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('GATEWAY_INVALID_JSON_' + res.status); }
  if (!res.ok || data?.ok !== true) throw new Error('GATEWAY_' + res.status + '_' + String(data?.error ?? 'request_failed').slice(0,120));
  if (data.role !== role || data.provider !== 'lovable-ai' || typeof data.content !== 'string' || data.content.trim().length < 16) throw new Error('GATEWAY_INVALID_RESULT');
  return data.content.slice(0,8000);
}

export async function runLive(event, { fetchImpl = fetch, env = process.env, oidc = getGitHubOidc } = {}) {
  const safe = validateEvent(event);
  const token = await oidc({ fetchImpl, env });
  const runId = String(env.GITHUB_RUN_ID ?? '');
  let pos = 0;
  const result = await execute(safe, {invoke: async (prompt) => {
    const role = AGENTS[pos++].id;
    return inference(role, prompt, {fetchImpl, token, runId});
  }});
  return result;
}

export async function main() {
  if (!process.env.GITHUB_EVENT_PATH) throw new Error('GITHUB_EVENT_PATH_MISSING');
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  validateEvent(event);
  try {
    const report = await runLive(event);
    await postComment(event.issue.number, issueReport(report));
    process.stdout.write(JSON.stringify({run:process.env.GITHUB_RUN_ID,issue:event.issue.number,status:report.status,agentCalls:report.modelInvocations}) + '\n');
  } catch (error) {
    await postComment(event.issue.number, '## OMEGA THOR — BLOCKED\n\nRemote inference unavailable. ' + String(error.message).slice(0,350));
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(e=>{console.error(e.message);process.exitCode=1;});
