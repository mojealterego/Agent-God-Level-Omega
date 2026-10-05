import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function tokenize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9_]+/g) ?? [];
}

function hashedVector(text, dimensions = 64) {
  const vec = Array(dimensions).fill(0);
  for (const token of tokenize(text)) {
    const digest = createHash('sha256').update(token).digest();
    const index = digest.readUInt32BE(0) % dimensions;
    const sign = (digest[4] & 1) ? 1 : -1;
    vec[index] += sign;
  }
  const norm = Math.sqrt(vec.reduce((sum, x) => sum + x * x, 0)) || 1;
  return vec.map((x) => x / norm);
}

function cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i];
  }
  if (!aa || !bb) return 0;
  return dot / Math.sqrt(aa * bb);
}

async function readJson(filePath, fallback) {
  try { return JSON.parse(await readFile(filePath, 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT') return structuredClone(fallback);
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await mkdir(dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(tmp, filePath);
}

export class NegotiationEngine {
  compare({ horizonMonths = 12, options = [], constraints = {}, incumbentId = null, batnaId = null }) {
    if (!Array.isArray(options) || options.length < 1) throw new Error('options must not be empty');
    const months = Math.max(1, finite(horizonMonths, 12));
    const evaluated = options.map((option) => {
      const monthlyInfra = finite(option.fixedMonthly) + finite(option.variableMonthly);
      const monthlyPeople = finite(option.engineeringHoursMonthly) * finite(option.hourlyRate);
      const tco = finite(option.migrationCost) + months * (monthlyInfra + monthlyPeople) + finite(option.securityCost) + finite(option.trainingCost) + finite(option.fineTuningCost);
      const violations = [];
      if (constraints.minAccuracy != null && finite(option.accuracy, -Infinity) < constraints.minAccuracy) violations.push('minAccuracy');
      if (constraints.maxP95LatencyMs != null && finite(option.p95LatencyMs, Infinity) > constraints.maxP95LatencyMs) violations.push('maxP95LatencyMs');
      if (constraints.maxTco != null && tco > constraints.maxTco) violations.push('maxTco');
      return { ...option, tco, eligible: violations.length === 0, violations };
    });
    const eligible = evaluated.filter((x) => x.eligible).sort((a, b) => a.tco - b.tco || finite(b.accuracy) - finite(a.accuracy));
    const recommended = eligible[0] ?? [...evaluated].sort((a, b) => a.violations.length - b.violations.length || a.tco - b.tco)[0];
    const batna = evaluated.find((x) => x.id === batnaId) ?? eligible.find((x) => x.id !== incumbentId) ?? null;
    const incumbent = evaluated.find((x) => x.id === incumbentId) ?? null;
    return {
      horizonMonths: months,
      options: evaluated,
      recommended,
      batna,
      leverage: {
        savingsVsIncumbent: incumbent && batna ? incumbent.tco - batna.tco : null,
        incumbentTco: incumbent?.tco ?? null,
        batnaTco: batna?.tco ?? null
      }
    };
  }
}

export class DecisionMatrix {
  rank({ criteria = [], options = [] }) {
    if (!criteria.length || !options.length) return [];
    const ranges = new Map();
    for (const criterion of criteria) {
      const values = options.map((o) => finite(o.metrics?.[criterion.key]));
      ranges.set(criterion.key, { min: Math.min(...values), max: Math.max(...values) });
    }
    return options.map((option, index) => {
      let score = 0;
      const normalized = {};
      for (const criterion of criteria) {
        const value = finite(option.metrics?.[criterion.key]);
        const { min, max } = ranges.get(criterion.key);
        let n = max === min ? 1 : (value - min) / (max - min);
        if (criterion.direction === 'min') n = 1 - n;
        normalized[criterion.key] = n;
        score += n * finite(criterion.weight, 1);
      }
      return { ...option, eligible: option.eligible !== false, score, normalized, _index: index };
    }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score || a._index - b._index)
      .map(({ _index, ...x }) => x);
  }
}

export class FailureMemory {
  constructor({ filePath, dimensions = 64 } = {}) {
    if (!filePath) throw new Error('filePath is required');
    this.filePath = filePath; this.dimensions = dimensions;
  }
  async add(record) {
    if (!record?.id) throw new Error('failure id is required');
    const state = await readJson(this.filePath, { version: 1, records: [] });
    const text = [record.task, record.error, record.lesson].filter(Boolean).join(' ');
    const item = { ...record, createdAt: record.createdAt ?? new Date().toISOString(), vector: hashedVector(text, this.dimensions) };
    state.records = state.records.filter((x) => x.id !== item.id); state.records.push(item);
    await writeJsonAtomic(this.filePath, state);
    return item;
  }
  async search(query, { limit = 5 } = {}) {
    const state = await readJson(this.filePath, { version: 1, records: [] });
    const q = hashedVector(query, this.dimensions);
    return state.records.map((record) => ({ ...record, similarity: cosine(q, record.vector ?? []) }))
      .sort((a, b) => b.similarity - a.similarity).slice(0, Math.max(1, limit));
  }
}

export class RetryController {
  constructor({ baseMs = 1000, maxMs = 30000, maxAttempts = 5, jitter = 0.2, random = Math.random } = {}) {
    this.baseMs = baseMs; this.maxMs = maxMs; this.maxAttempts = maxAttempts; this.jitter = jitter; this.random = random;
  }
  delayFor({ attempt, retryAfterMs = null }) {
    if (retryAfterMs != null) return Math.min(this.maxMs, Math.max(0, finite(retryAfterMs)));
    const raw = Math.min(this.maxMs, this.baseMs * (2 ** Math.max(0, attempt - 1)));
    const factor = 1 + this.jitter * ((this.random() * 2) - 1);
    return Math.round(raw * factor);
  }
  shouldRetry({ attempt, status, errorCode }) {
    if (attempt >= this.maxAttempts) return false;
    if ([408, 425, 429, 500, 502, 503, 504].includes(status)) return true;
    return ['ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN', 'ECONNREFUSED'].includes(errorCode);
  }
}

export class LatencyBudget {
  constructor({ timeoutMs = 2000 } = {}) { this.timeoutMs = timeoutMs; }
  async collect(tasks) {
    const results = {}; const errors = {}; let completed = 0; let timer;
    let resolveDone;
    const done = new Promise((resolve) => { resolveDone = resolve; });
    const controllers = tasks.map(() => new AbortController());
    const tracked = tasks.map((task, index) => Promise.resolve().then(() => task.run({ signal: controllers[index].signal })).then(
      (value) => { results[task.id] = value; completed += 1; if (completed === tasks.length) resolveDone('complete'); },
      (error) => { errors[task.id] = error?.message ?? String(error); completed += 1; if (completed === tasks.length) resolveDone('complete'); }
    ));
    const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), this.timeoutMs); });
    const status = await Promise.race([done, timeout]);
    clearTimeout(timer);
    if (status === 'timeout') controllers.forEach((controller) => controller.abort());
    for (const promise of tracked) promise.catch(() => {});
    return { results, errors, completed, total: tasks.length, timedOut: status === 'timeout', remaining: tasks.length - completed };
  }
}

export class EpsilonGreedyBandit {
  constructor({ epsilon = 0.05, random = Math.random } = {}) { this.epsilon = epsilon; this.random = random; this.arms = new Map(); }
  register(id) { if (!this.arms.has(id)) this.arms.set(id, { id, count: 0, reward: 0 }); return this.arms.get(id); }
  observe(id, reward) { const arm = this.register(id); arm.count += 1; arm.reward += finite(reward); return { ...arm, mean: arm.reward / arm.count }; }
  select() {
    const arms = [...this.arms.values()]; if (!arms.length) throw new Error('No arms registered');
    const explore = this.random() < this.epsilon;
    let arm;
    if (explore) arm = arms[Math.min(arms.length - 1, Math.floor(this.random() * arms.length))];
    else arm = [...arms].sort((a, b) => ((b.count ? b.reward / b.count : 0) - (a.count ? a.reward / a.count : 0)) || a.id.localeCompare(b.id))[0];
    return { arm: arm.id, mode: explore ? 'explore' : 'exploit', estimate: arm.count ? arm.reward / arm.count : 0 };
  }
}

export class DriftDetector {
  constructor({ threshold = 0.35, dimensions = 64 } = {}) { this.threshold = threshold; this.dimensions = dimensions; this.count = 0; this.centroid = Array(dimensions).fill(0); }
  observe(text) {
    const v = hashedVector(text, this.dimensions); this.count += 1;
    this.centroid = this.centroid.map((x, i) => x + (v[i] - x) / this.count);
    return this.scoreVector(v);
  }
  scoreVector(v) { const similarity = cosine(v, this.centroid); const distance = 1 - similarity; return { similarity, distance, anomalous: this.count > 0 && distance >= this.threshold }; }
  score(text) { return this.scoreVector(hashedVector(text, this.dimensions)); }
}

export class ServiceRegistry {
  constructor({ now = Date.now } = {}) { this.now = now; this.services = new Map(); }
  register(service) {
    if (!service?.id || !service?.endpoint) throw new Error('id and endpoint are required');
    const record = { priority: 0, ttlMs: 30000, capabilities: [], ...service, lastSeenAt: this.now() };
    this.services.set(record.id, record); return record;
  }
  heartbeat(id) { const record = this.services.get(id); if (!record) throw new Error(`Unknown service ${id}`); record.lastSeenAt = this.now(); return record; }
  resolve(capability) {
    const now = this.now();
    return [...this.services.values()].filter((s) => now - s.lastSeenAt <= s.ttlMs && s.capabilities.includes(capability))
      .sort((a, b) => finite(b.priority) - finite(a.priority) || a.lastSeenAt - b.lastSeenAt);
  }
}

function levenshtein(a, b) {
  const x = String(a); const y = String(b); const dp = Array(y.length + 1).fill(0).map((_, j) => j);
  for (let i = 1; i <= x.length; i += 1) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= y.length; j += 1) {
      const old = dp[j]; dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1)); prev = old;
    }
  }
  return dp[y.length];
}
function fuzzyScore(a, b) {
  const aa = tokenize(a).join(' '); const bb = tokenize(b).join(' '); if (!aa || !bb) return 0;
  const lev = 1 - levenshtein(aa, bb) / Math.max(aa.length, bb.length, 1);
  const A = new Set(tokenize(aa)); const B = new Set(tokenize(bb)); const inter = [...A].filter((x) => B.has(x)).length; const union = new Set([...A, ...B]).size || 1;
  return 0.45 * lev + 0.55 * (inter / union);
}
export class FuzzyResolver {
  constructor({ ambiguityMargin = 0.08, minScore = 0.3 } = {}) { this.ambiguityMargin = ambiguityMargin; this.minScore = minScore; }
  resolve(query, candidates) {
    const ranked = candidates.map((c) => ({ ...c, score: fuzzyScore(query, c.label ?? c.id) })).sort((a, b) => b.score - a.score);
    if (!ranked.length || ranked[0].score < this.minScore) return { status: 'NO_MATCH', candidates: ranked.slice(0, 3) };
    if (ranked[1] && ranked[1].score >= this.minScore && ranked[0].score - ranked[1].score <= this.ambiguityMargin) return { status: 'AMBIGUOUS', candidates: ranked.slice(0, 3) };
    return { status: 'RESOLVED', match: ranked[0], candidates: ranked.slice(0, 3) };
  }
}

export class DagExecutor {
  constructor({ concurrency = 4 } = {}) { this.concurrency = Math.max(1, concurrency); }
  async run(nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n])); if (byId.size !== nodes.length) throw new Error('Duplicate DAG node id');
    for (const n of nodes) for (const dep of n.deps ?? []) if (!byId.has(dep)) throw new Error(`Missing dependency ${dep} for ${n.id}`);
    const pending = new Set(byId.keys()); const completed = new Set(); const results = {}; const errors = {};
    while (pending.size) {
      const ready = [...pending].filter((id) => (byId.get(id).deps ?? []).every((d) => completed.has(d))).slice(0, this.concurrency);
      if (!ready.length) throw new Error('DAG contains a cycle or blocked dependency');
      const batch = await Promise.all(ready.map(async (id) => {
        try { return { id, ok: true, value: await byId.get(id).run({ results: { ...results } }) }; }
        catch (error) { return { id, ok: false, error }; }
      }));
      for (const item of batch) {
        pending.delete(item.id);
        if (!item.ok) { errors[item.id] = item.error?.message ?? String(item.error); throw new Error(`DAG node ${item.id} failed: ${errors[item.id]}`); }
        results[item.id] = item.value; completed.add(item.id);
      }
    }
    return { results, errors, completed: [...completed] };
  }
}

export class GracefulDegradation {
  select(candidates, { requiredCapability = null } = {}) {
    const healthy = candidates.filter((x) => x.healthy !== false && (!requiredCapability || x.capability === requiredCapability || x.capabilities?.includes(requiredCapability)));
    return healthy.sort((a, b) => finite(b.priority) - finite(a.priority))[0] ?? null;
  }
  loadShed(tasks, { keep }) {
    const ranked = [...tasks].sort((a, b) => finite(b.priority) - finite(a.priority));
    return { kept: ranked.slice(0, keep), shed: ranked.slice(keep) };
  }
}

export class ConfidenceGate {
  constructor({ defaultThreshold = 0.8, highRiskThreshold = 0.98 } = {}) { this.defaultThreshold = defaultThreshold; this.highRiskThreshold = highRiskThreshold; }
  decide({ confidence, risk = 'low' }) {
    const threshold = ['high', 'critical'].includes(risk) ? this.highRiskThreshold : this.defaultThreshold;
    return { action: confidence >= threshold ? 'AUTO' : 'HUMAN_REVIEW', confidence, threshold, risk };
  }
}

export class NaiveBayesRouter {
  constructor() { this.docs = new Map(); this.counts = new Map(); this.vocab = new Set(); this.totalDocs = 0; }
  train(label, text) {
    const tokens = tokenize(text); this.totalDocs += 1; this.docs.set(label, (this.docs.get(label) ?? 0) + 1);
    if (!this.counts.has(label)) this.counts.set(label, new Map());
    const map = this.counts.get(label); for (const t of tokens) { this.vocab.add(t); map.set(t, (map.get(t) ?? 0) + 1); }
  }
  classify(text) {
    if (!this.totalDocs) throw new Error('Classifier is not trained');
    const tokens = tokenize(text); const scores = [];
    for (const [label, docCount] of this.docs) {
      const counts = this.counts.get(label); const totalTokens = [...counts.values()].reduce((a, b) => a + b, 0); let logp = Math.log(docCount / this.totalDocs);
      for (const t of tokens) logp += Math.log(((counts.get(t) ?? 0) + 1) / (totalTokens + this.vocab.size));
      scores.push({ label, logProbability: logp });
    }
    scores.sort((a, b) => b.logProbability - a.logProbability); return scores[0];
  }
}

export class ContextOptimizer {
  constructor({ recentCount = 3 } = {}) { this.recentCount = recentCount; }
  compact(items, { maxTokens }) {
    const recent = items.slice(-this.recentCount); const recentIds = new Set(recent.map((x) => x.id));
    const older = items.slice(0, Math.max(0, items.length - this.recentCount)).sort((a, b) => finite(b.salience) - finite(a.salience));
    const selected = []; let used = 0;
    for (const item of recent) { const t = finite(item.tokens, tokenize(item.text).length || 1); if (used + t <= maxTokens) { selected.push(item); used += t; } }
    for (const item of older) { if (recentIds.has(item.id)) continue; const t = finite(item.tokens, tokenize(item.text).length || 1); if (used + t <= maxTokens) { selected.push(item); used += t; } }
    selected.sort((a, b) => items.findIndex((x) => x.id === a.id) - items.findIndex((x) => x.id === b.id));
    return { items: selected, usedTokens: used, dropped: items.filter((x) => !selected.some((s) => s.id === x.id)).map((x) => x.id) };
  }
}

export class KnowledgeGraph {
  constructor({ filePath } = {}) { if (!filePath) throw new Error('filePath is required'); this.filePath = filePath; }
  async #state() { return await readJson(this.filePath, { version: 1, nodes: {}, edges: [] }); }
  async upsertNode(node) { const s = await this.#state(); s.nodes[node.id] = { ...(s.nodes[node.id] ?? {}), ...node }; await writeJsonAtomic(this.filePath, s); return s.nodes[node.id]; }
  async link(edge) { const s = await this.#state(); if (!s.nodes[edge.from] || !s.nodes[edge.to]) throw new Error('Both edge nodes must exist'); const e = { ...edge, id: edge.id ?? `${edge.from}:${edge.relation}:${edge.to}` }; s.edges = s.edges.filter((x) => x.id !== e.id); s.edges.push(e); await writeJsonAtomic(this.filePath, s); return e; }
  async neighbors(id, { relation = null } = {}) { const s = await this.#state(); return s.edges.filter((e) => e.from === id && (!relation || e.relation === relation)).map((edge) => ({ edge, node: s.nodes[edge.to] })); }
}

function metricSummary(items) {
  if (!items.length) return { count: 0, successRate: 0, avgLatencyMs: null, avgCost: null, avgScore: null };
  const avg = (key) => items.reduce((s, x) => s + finite(x[key]), 0) / items.length;
  return { count: items.length, successRate: items.filter((x) => x.success).length / items.length, avgLatencyMs: avg('latencyMs'), avgCost: avg('cost'), avgScore: avg('score') };
}
export class ShadowExperiment {
  constructor() { this.rows = []; }
  observe(row) { this.rows.push(row); return row; }
  summary() {
    const baseline = metricSummary(this.rows.map((x) => x.baseline)); const candidate = metricSummary(this.rows.map((x) => x.candidate));
    return { baseline, candidate, delta: { successRate: candidate.successRate - baseline.successRate, avgLatencyMs: candidate.avgLatencyMs - baseline.avgLatencyMs, avgCost: candidate.avgCost - baseline.avgCost, avgScore: candidate.avgScore - baseline.avgScore } };
  }
}

export class PreferenceLedger {
  constructor({ filePath } = {}) { if (!filePath) throw new Error('filePath is required'); this.filePath = filePath; }
  async add(record) { const s = await readJson(this.filePath, { version: 1, records: [] }); s.records.push({ ...record, createdAt: record.createdAt ?? new Date().toISOString() }); await writeJsonAtomic(this.filePath, s); return s.records.at(-1); }
  async export() { const s = await readJson(this.filePath, { version: 1, records: [] }); return { ...s, trainingApplied: false, note: 'Preference data only; no DPO/weight update is performed by this runtime.' }; }
}

export class DistillationDataset {
  constructor() { this.examples = []; }
  add(example) { this.examples.push(structuredClone(example)); return example; }
  export() { return { examples: structuredClone(this.examples), studentTrained: false, note: 'Dataset preparation only; external trainer required.' }; }
}

export class GoalRewardOptimizer {
  select(candidates, { reward = {}, constraints = {} } = {}) {
    const eligible = candidates.filter((candidate) => Object.entries(constraints).every(([key, rule]) => {
      const v = finite(candidate.metrics?.[key]); return (rule.min == null || v >= rule.min) && (rule.max == null || v <= rule.max);
    }));
    const pool = eligible.length ? eligible : [];
    if (!pool.length) return null;
    return pool.map((candidate) => ({ ...candidate, globalReward: Object.entries(reward).reduce((sum, [key, weight]) => sum + finite(candidate.metrics?.[key]) * finite(weight), 0) }))
      .sort((a, b) => b.globalReward - a.globalReward)[0];
  }
}

export class StructuredOutputValidator {
  validate(value, schema) { const errors = []; this.#validate(value, schema, '$', errors); return { valid: errors.length === 0, errors }; }
  #validate(value, schema, path, errors) {
    if (!schema) return;
    const type = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (schema.type && type !== schema.type) { errors.push({ path, code: 'type', expected: schema.type, actual: type }); return; }
    if (schema.type === 'object') {
      for (const key of schema.required ?? []) if (!(key in value)) errors.push({ path: `${path}.${key}`, code: 'required' });
      for (const [key, val] of Object.entries(value)) {
        if (!schema.properties?.[key]) { if (schema.additionalProperties === false) errors.push({ path: `${path}.${key}`, code: 'additionalProperty' }); }
        else this.#validate(val, schema.properties[key], `${path}.${key}`, errors);
      }
    }
    if (schema.type === 'array') for (let i = 0; i < value.length; i += 1) this.#validate(value[i], schema.items, `${path}[${i}]`, errors);
    if (schema.type === 'number') { if (schema.minimum != null && value < schema.minimum) errors.push({ path, code: 'minimum', limit: schema.minimum }); if (schema.maximum != null && value > schema.maximum) errors.push({ path, code: 'maximum', limit: schema.maximum }); }
    if (schema.type === 'string') { if (schema.minLength != null && value.length < schema.minLength) errors.push({ path, code: 'minLength', limit: schema.minLength }); }
    if (schema.enum && !schema.enum.includes(value)) errors.push({ path, code: 'enum', allowed: schema.enum });
  }
}

export class IncidentPostmortem {
  build({ incident, contributingFactors = [], actions = [], timeline = [] }) {
    return { incident, blamePolicy: 'BLAMELESS', contributingFactors: [...contributingFactors], timeline: [...timeline], actions: actions.map((x) => ({ ...x })), focus: 'process-controls-guardrails' };
  }
}

export class SpeculativePrefetch {
  constructor({ threshold = 0.8 } = {}) { this.threshold = threshold; this.jobs = new Map(); }
  schedule({ id, confidence, run }) {
    if (confidence < this.threshold) return { id, started: false, confidence, threshold: this.threshold };
    const controller = new AbortController(); const promise = Promise.resolve().then(() => run({ signal: controller.signal }));
    this.jobs.set(id, { controller, promise, confidence }); return { id, started: true, confidence };
  }
  cancel(id) { const job = this.jobs.get(id); if (!job) return false; job.controller.abort(); return true; }
  async result(id) { const job = this.jobs.get(id); if (!job) throw new Error(`Unknown prefetch ${id}`); return await job.promise; }
}

export class AsyncJobRegistry {
  constructor({ filePath } = {}) {
    if (!filePath) throw new Error('filePath is required');
    this.filePath = filePath;
  }
  async register(job) {
    if (!job?.id) throw new Error('job id is required');
    const state = await readJson(this.filePath, { version: 1, jobs: {} });
    const record = {
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...job
    };
    state.jobs[record.id] = record;
    await writeJsonAtomic(this.filePath, state);
    return record;
  }
  async complete({ id, status = 'SUCCEEDED', result = null, error = null }) {
    const state = await readJson(this.filePath, { version: 1, jobs: {} });
    const current = state.jobs[id];
    if (!current) throw new Error(`Unknown job ${id}`);
    const record = {
      ...current,
      status,
      result,
      error,
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };
    state.jobs[id] = record;
    await writeJsonAtomic(this.filePath, state);
    return record;
  }
  async status(id) {
    const state = await readJson(this.filePath, { version: 1, jobs: {} });
    return state.jobs[id] ?? null;
  }
  async list() {
    const state = await readJson(this.filePath, { version: 1, jobs: {} });
    return Object.values(state.jobs);
  }
}

function meanVector(vectors, dimensions) {
  if (!vectors.length) return Array(dimensions).fill(0);
  const out = Array(dimensions).fill(0);
  for (const vector of vectors) for (let i = 0; i < dimensions; i += 1) out[i] += vector[i] ?? 0;
  return out.map((x) => x / vectors.length);
}

export class SemanticClusterRouter {
  constructor({ dimensions = 64, k = 4, iterations = 10 } = {}) {
    this.dimensions = dimensions;
    this.k = Math.max(1, k);
    this.iterations = Math.max(1, iterations);
    this.items = [];
    this.centroids = [];
    this.assignments = [];
  }
  fit(items) {
    if (!Array.isArray(items) || items.length < 1) throw new Error('items must not be empty');
    this.items = items.map((item) => ({ ...item, vector: hashedVector(item.text ?? item.label ?? item.id, this.dimensions) }));
    const clusterCount = Math.min(this.k, this.items.length);
    this.centroids = this.items.slice(0, clusterCount).map((item) => [...item.vector]);
    this.assignments = Array(this.items.length).fill(0);
    for (let iteration = 0; iteration < this.iterations; iteration += 1) {
      let changed = false;
      for (let i = 0; i < this.items.length; i += 1) {
        const scores = this.centroids.map((centroid, index) => ({ index, score: cosine(this.items[i].vector, centroid) }));
        scores.sort((a, b) => b.score - a.score || a.index - b.index);
        const next = scores[0].index;
        if (this.assignments[i] !== next) changed = true;
        this.assignments[i] = next;
      }
      const nextCentroids = this.centroids.map((centroid, cluster) => {
        const members = this.items.filter((_, i) => this.assignments[i] === cluster).map((x) => x.vector);
        return members.length ? meanVector(members, this.dimensions) : centroid;
      });
      this.centroids = nextCentroids;
      if (!changed && iteration > 0) break;
    }
    return this.snapshot();
  }
  route(text) {
    if (!this.centroids.length) throw new Error('Router is not fitted');
    const vector = hashedVector(text, this.dimensions);
    const ranked = this.centroids.map((centroid, cluster) => ({ cluster, similarity: cosine(vector, centroid) })).sort((a, b) => b.similarity - a.similarity || a.cluster - b.cluster);
    const best = ranked[0];
    const members = this.items.filter((_, i) => this.assignments[i] === best.cluster).map(({ vector: _vector, ...item }) => item);
    return { ...best, members };
  }
  snapshot() {
    return {
      k: this.centroids.length,
      items: this.items.map(({ vector: _vector, ...item }, i) => ({ ...item, cluster: this.assignments[i] }))
    };
  }
}

export class DecisionTraceAuditor {
  audit({ decision, claims = [], evidence = [] } = {}) {
    const evidenceMap = new Map(evidence.map((item) => [item.id, item]));
    const findings = [];
    for (const claim of claims) {
      if (!Array.isArray(claim.evidenceIds) || claim.evidenceIds.length === 0) {
        findings.push({ claimId: claim.id, code: 'NO_EVIDENCE', severity: 'high' });
        continue;
      }
      for (const id of claim.evidenceIds) {
        const item = evidenceMap.get(id);
        if (!item) findings.push({ claimId: claim.id, evidenceId: id, code: 'MISSING_EVIDENCE', severity: 'high' });
        else if (item.state !== 'OBSERVED') findings.push({ claimId: claim.id, evidenceId: id, code: 'NON_OBSERVED_EVIDENCE', severity: 'medium', state: item.state });
      }
    }
    return {
      decision,
      valid: findings.length === 0,
      findings,
      hiddenChainOfThoughtRequired: false,
      auditedSurface: 'structured-claims-and-evidence'
    };
  }
}

export class TechnologyRadar {
  constructor({ filePath } = {}) {
    if (!filePath) throw new Error('filePath is required');
    this.filePath = filePath;
    this.allowedRings = new Set(['ADOPT', 'TRIAL', 'ASSESS', 'HOLD']);
  }
  async upsert(entry) {
    if (!entry?.id) throw new Error('technology id is required');
    if (!this.allowedRings.has(entry.ring)) throw new Error(`Unsupported radar ring: ${entry.ring}`);
    const state = await readJson(this.filePath, { version: 1, items: {} });
    const now = new Date().toISOString();
    const item = {
      ...(state.items[entry.id] ?? {}),
      ...entry,
      evidence: [...new Set(entry.evidence ?? state.items[entry.id]?.evidence ?? [])],
      risks: [...new Set(entry.risks ?? state.items[entry.id]?.risks ?? [])],
      updatedAt: now,
      createdAt: state.items[entry.id]?.createdAt ?? now
    };
    state.items[entry.id] = item;
    await writeJsonAtomic(this.filePath, state);
    return item;
  }
  async get(id) {
    const state = await readJson(this.filePath, { version: 1, items: {} });
    return state.items[id] ?? null;
  }
  async list({ ring = null } = {}) {
    const state = await readJson(this.filePath, { version: 1, items: {} });
    return Object.values(state.items).filter((item) => !ring || item.ring === ring);
  }
}

export class SamplingPolicy {
  forMode(mode = 'balanced') {
    const presets = {
      deterministic: { temperature: 0.0, topP: 1.0 },
      balanced: { temperature: 0.3, topP: 0.95 },
      creative: { temperature: 0.8, topP: 0.98 }
    };
    const selected = presets[mode];
    if (!selected) throw new Error(`Unsupported sampling mode: ${mode}`);
    return { ...selected, mode, weightMutation: false, note: 'Sampling parameters only; no model-weight mutation is performed.' };
  }
}
