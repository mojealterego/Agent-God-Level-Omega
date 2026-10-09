/** OMEGA TinyFish provider adapter. No credentials are persisted or logged. */
const BASE_URL = 'https://agent.tinyfish.ai';
const RUN_ID = /^[A-Za-z0-9_-]{1,100}$/;
const PROFILE_ID = /^[A-Za-z0-9_-]{1,100}$/;

function hosts(value) {
  return new Set(String(value ?? '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
}

function validPublicHost(host) {
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.startsWith('[') || host.includes(':')) return false;
  if (host.length > 253 || host.includes('..') || !host.includes('.')) return false;
  return host.split('.').every(part => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part) && part.length <= 63);
}

export function preflight(request = {}, environment = {}) {
  const blockers = [];
  let parsed;
  try {
    parsed = new URL(request.url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port || parsed.hash) blockers.push('INVALID_URL');
    if (!validPublicHost(parsed.hostname)) blockers.push('PRIVATE_OR_INVALID_HOST');
    if (!hosts(environment.allowedHosts).has(parsed.hostname.toLowerCase())) blockers.push('HOST_NOT_ALLOWLISTED');
  } catch { blockers.push('INVALID_URL'); }
  if (typeof request.goal !== 'string' || !request.goal.trim() || request.goal.length > 3000) blockers.push('INVALID_GOAL');
  if (!['read', 'write'].includes(request.scope)) blockers.push('INVALID_SCOPE');
  if (request.approved !== true) blockers.push('RUN_APPROVAL_REQUIRED');
  if (environment.runsEnabled !== true) blockers.push('RUNS_DISABLED');
  if (request.scope === 'write' && request.writeApproved !== true) blockers.push('WRITE_APPROVAL_REQUIRED');
  if (request.scope === 'write' && environment.writesEnabled !== true) blockers.push('WRITES_DISABLED');
  if (request.profileId !== undefined && (request.useProfile !== true || typeof request.profileId !== 'string' || !PROFILE_ID.test(request.profileId))) blockers.push('INVALID_PROFILE');
  if (request.outputSchema !== undefined && (!request.outputSchema || Array.isArray(request.outputSchema) || request.outputSchema.type !== 'object')) blockers.push('INVALID_OUTPUT_SCHEMA');
  return {allowed:blockers.length === 0, blockers, host:parsed?.hostname ?? null, scope:request.scope ?? null};
}

function providerPayload(req) {
  const payload = {url:req.url, goal:req.goal};
  if (req.outputSchema !== undefined) payload.output_schema = req.outputSchema;
  if (req.useProfile === true) payload.use_profile = true;
  if (req.profileId !== undefined) payload.profile_id = req.profileId;
  return payload;
}

export class TinyFishClient {
  constructor({apiKey,environment = {},transport = fetch} = {}) {
    this.apiKey = apiKey;
    this.environment = environment;
    this.transport = transport;
  }

  async request(path, method, body) {
    if (!this.apiKey || typeof this.apiKey !== 'string') throw new Error('TINYFISH_API_KEY_MISSING');
    const options = {method, headers:{'X-API-Key':this.apiKey,'Accept':'application/json'}, signal:AbortSignal.timeout(120000)};
    if (body !== undefined) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await this.transport(`${BASE_URL}${path}`,options);
    if (!response.ok) throw new Error(`TinyFish HTTP ${response.status}`);
    return response.json();
  }

  async start(req) {
    const result = preflight(req,this.environment);
    if (!result.allowed) throw new Error(`TinyFish preflight blocked: ${result.blockers.join(',')}`);
    return this.request('/v1/automation/run-async','POST',providerPayload(req));
  }

  async getRun(runId) {
    if (typeof runId !== 'string' || !RUN_ID.test(runId)) throw new Error('INVALID_RUN_ID');
    return this.request(`/v1/runs/${runId}`,'GET');
  }

  async cancel(runId,{approved = false} = {}) {
    if (approved !== true) throw new Error('CANCEL_APPROVAL_REQUIRED');
    if (typeof runId !== 'string' || !RUN_ID.test(runId)) throw new Error('INVALID_RUN_ID');
    return this.request(`/v1/runs/${runId}/cancel`,'POST');
  }
}
