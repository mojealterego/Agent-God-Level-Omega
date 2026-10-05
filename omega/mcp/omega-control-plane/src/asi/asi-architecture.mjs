import { createHash, generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const clone = (x) => structuredClone(x);
const finite = (x, d = 0) => Number.isFinite(Number(x)) ? Number(x) : d;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const EPS = 1e-12;

async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (e) { if (e?.code === 'ENOENT') return clone(fallback); throw e; }
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(tmp, path);
}
function tokens(text) {
  return String(text ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').match(/[a-z0-9_]+/g) ?? [];
}
function semanticVector(text, dimensions = 96) {
  const out = Array(dimensions).fill(0);
  for (const token of tokens(text)) {
    const d = createHash('sha256').update(token).digest();
    const i = d.readUInt32BE(0) % dimensions;
    out[i] += (d[4] & 1) ? 1 : -1;
  }
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map(x => x / norm);
}
function cosine(a, b) {
  const n = Math.min(a.length, b.length); let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < n; i += 1) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
function euclidean(a, b) {
  let s = 0; for (let i = 0; i < Math.min(a.length, b.length); i += 1) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function entropyFromCounts(counts) {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (!total) return 0;
  let h = 0;
  for (const count of counts.values()) { const p = count / total; if (p > 0) h -= p * Math.log2(p); }
  return h;
}

export class ActiveInferencePlanner {
  constructor({ epistemicWeight = 1 } = {}) { this.epistemicWeight = epistemicWeight; }
  rank(actions = []) {
    return actions.map(action => {
      let risk = 0, ambiguity = 0, informationGain = 0;
      for (const outcome of action.outcomes ?? []) {
        const p = clamp(finite(outcome.probability, 0));
        if (!p) continue;
        risk += p * -Math.log(Math.max(EPS, clamp(finite(outcome.preferredProbability, EPS), EPS, 1)));
        ambiguity += p * Math.max(0, finite(outcome.ambiguity));
        informationGain += p * Math.max(0, finite(outcome.informationGain));
      }
      const expectedFreeEnergy = risk + ambiguity - this.epistemicWeight * informationGain;
      return { ...action, risk, ambiguity, informationGain, expectedFreeEnergy, biologicalFreeEnergyClaimed: false };
    }).sort((a, b) => a.expectedFreeEnergy - b.expectedFreeEnergy || String(a.id).localeCompare(String(b.id)));
  }
}

class UnionFind {
  constructor(n) { this.parent = Array.from({ length: n }, (_, i) => i); this.rank = Array(n).fill(0); }
  find(x) { while (this.parent[x] !== x) { this.parent[x] = this.parent[this.parent[x]]; x = this.parent[x]; } return x; }
  union(a, b) { a = this.find(a); b = this.find(b); if (a === b) return false; if (this.rank[a] < this.rank[b]) [a, b] = [b, a]; this.parent[b] = a; if (this.rank[a] === this.rank[b]) this.rank[a] += 1; return true; }
}
export class RipsTopologyAnalyzer {
  analyze(points, { threshold = 1 } = {}) {
    if (!Array.isArray(points) || !points.length) return { vertices: 0, edges: 0, betti0: 0, betti1Graph: 0, voidCandidates: [], fullPersistentHomologyClaimed: false };
    const uf = new UnionFind(points.length); const edges = []; const degree = Array(points.length).fill(0);
    for (let i = 0; i < points.length; i += 1) for (let j = i + 1; j < points.length; j += 1) {
      const d = euclidean(points[i], points[j]); if (d <= threshold) { edges.push([i, j, d]); degree[i]++; degree[j]++; uf.union(i, j); }
    }
    const components = new Map();
    for (let i = 0; i < points.length; i += 1) { const r = uf.find(i); if (!components.has(r)) components.set(r, []); components.get(r).push(i); }
    const betti0 = components.size;
    const betti1Graph = Math.max(0, edges.length - points.length + betti0);
    const avgDegree = degree.reduce((a, b) => a + b, 0) / degree.length;
    const voidCandidates = degree.map((d, i) => ({ index: i, degree: d })).filter(x => x.degree < Math.max(1, avgDegree * 0.5));
    return { vertices: points.length, edges: edges.length, betti0, betti1Graph, components: [...components.values()], voidCandidates, fullPersistentHomologyClaimed: false, note: 'Bounded Vietoris–Rips 1-skeleton analysis; Betti1 is graph cyclomatic rank, not full higher-dimensional persistent homology.' };
  }
}

export class LayeredConsistencyGate {
  constructor({ maxDepth = 32 } = {}) { this.maxDepth = maxDepth; }
  check({ dependencies = [], assertions = [] } = {}) {
    const findings = []; const graph = new Map();
    for (const [from, to] of dependencies) { if (!graph.has(from)) graph.set(from, []); graph.get(from).push(to); if (!graph.has(to)) graph.set(to, []); }
    const visiting = new Set(), visited = new Set();
    const dfs = (node, depth = 0, path = []) => {
      if (depth > this.maxDepth) { findings.push({ code: 'RECURSION_BUDGET_EXCEEDED', node, path }); return; }
      if (visiting.has(node)) { findings.push({ code: 'DEPENDENCY_CYCLE', node, path: [...path, node] }); return; }
      if (visited.has(node)) return;
      visiting.add(node); for (const next of graph.get(node) ?? []) dfs(next, depth + 1, [...path, node]); visiting.delete(node); visited.add(node);
    };
    for (const node of graph.keys()) dfs(node);
    const seen = new Map();
    for (const assertion of assertions) {
      if (!assertion?.key) continue;
      const repr = canonicalJson(assertion.value);
      if (seen.has(assertion.key) && seen.get(assertion.key) !== repr) findings.push({ code: 'CONTRADICTION', key: assertion.key, values: [seen.get(assertion.key), repr] });
      else seen.set(assertion.key, repr);
    }
    return { allowed: findings.length === 0, findings, haltingProblemSolved: false, godelConsistencyProven: false, assurance: 'bounded-structural-consistency' };
  }
}

export class ActivationFactorizer {
  constructor({ components = 4, iterations = 100, epsilon = 1e-9 } = {}) { this.components = Math.max(1, components); this.iterations = Math.max(1, iterations); this.epsilon = epsilon; }
  factorize(matrix) {
    if (!Array.isArray(matrix) || !matrix.length || !matrix[0]?.length) throw new Error('matrix must be non-empty');
    const m = matrix.length, n = matrix[0].length, k = Math.min(this.components, m, n);
    const min = Math.min(...matrix.flat().map(Number)); const shift = min < 0 ? -min : 0;
    const V = matrix.map(row => row.map(x => finite(x) + shift));
    let W = Array.from({ length: m }, (_, i) => Array.from({ length: k }, (_, j) => 0.5 + ((i + 1) * (j + 2) % 7) / 10));
    let H = Array.from({ length: k }, (_, i) => Array.from({ length: n }, (_, j) => 0.5 + ((i + 3) * (j + 1) % 5) / 10));
    for (let it = 0; it < this.iterations; it += 1) {
      const WtV = Array.from({ length: k }, () => Array(n).fill(0)); const WtWH = Array.from({ length: k }, () => Array(n).fill(0));
      for (let a = 0; a < k; a++) for (let j = 0; j < n; j++) {
        let num = 0, den = 0;
        for (let i = 0; i < m; i++) { num += W[i][a] * V[i][j]; let wh = 0; for (let b = 0; b < k; b++) wh += W[i][b] * H[b][j]; den += W[i][a] * wh; }
        WtV[a][j] = num; WtWH[a][j] = den;
      }
      H = H.map((row, a) => row.map((h, j) => Math.max(this.epsilon, h * WtV[a][j] / Math.max(this.epsilon, WtWH[a][j]))));
      const VHt = Array.from({ length: m }, () => Array(k).fill(0)); const WHHt = Array.from({ length: m }, () => Array(k).fill(0));
      for (let i = 0; i < m; i++) for (let a = 0; a < k; a++) {
        let num = 0, den = 0; for (let j = 0; j < n; j++) { num += V[i][j] * H[a][j]; let wh = 0; for (let b = 0; b < k; b++) wh += W[i][b] * H[b][j]; den += wh * H[a][j]; }
        VHt[i][a] = num; WHHt[i][a] = den;
      }
      W = W.map((row, i) => row.map((w, a) => Math.max(this.epsilon, w * VHt[i][a] / Math.max(this.epsilon, WHHt[i][a]))));
    }
    let err = 0; for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) { let pred = 0; for (let a = 0; a < k; a++) pred += W[i][a] * H[a][j]; const d = V[i][j] - pred; err += d * d; }
    const components = H.map((featureWeights, index) => ({ index, featureWeights, sparsity: featureWeights.filter(x => x < 0.05 * Math.max(...featureWeights, this.epsilon)).length / n }));
    return { components, sampleLoadings: W, reconstructionError: Math.sqrt(err / (m * n)), inputShift: shift, monosemanticityProven: false, method: 'bounded-nmf' };
  }
}

export class SemanticDependencyGraph {
  constructor() { this.nodes = new Map(); this.dependsOn = new Map(); this.reverse = new Map(); }
  upsert(id, value) {
    const prior = this.nodes.get(id); this.nodes.set(id, { id, stale: false, ...prior, ...clone(value) });
    const changed = prior && canonicalJson({ ...prior, stale: false }) !== canonicalJson({ ...this.nodes.get(id), stale: false });
    const invalidated = changed ? this.#invalidateDependents(id) : [];
    return { node: clone(this.nodes.get(id)), invalidated };
  }
  link(dependent, dependency) {
    if (!this.dependsOn.has(dependent)) this.dependsOn.set(dependent, new Set()); this.dependsOn.get(dependent).add(dependency);
    if (!this.reverse.has(dependency)) this.reverse.set(dependency, new Set()); this.reverse.get(dependency).add(dependent);
  }
  #invalidateDependents(id) {
    const out = []; const queue = [...(this.reverse.get(id) ?? [])]; const seen = new Set();
    while (queue.length) { const cur = queue.shift(); if (seen.has(cur)) continue; seen.add(cur); const node = this.nodes.get(cur); if (node) { node.stale = true; out.push(cur); } queue.push(...(this.reverse.get(cur) ?? [])); }
    return out;
  }
  get(id) { return this.nodes.has(id) ? clone(this.nodes.get(id)) : null; }
  snapshot() {
    return {
      nodes: [...this.nodes.values()].map(clone),
      links: [...this.dependsOn.entries()].flatMap(([dependent, deps]) => [...deps].map(dependency => ({ dependent, dependency })))
    };
  }
  restore(snapshot = {}) {
    this.nodes.clear(); this.dependsOn.clear(); this.reverse.clear();
    for (const node of snapshot.nodes ?? []) this.nodes.set(node.id, clone(node));
    for (const link of snapshot.links ?? []) this.link(link.dependent, link.dependency);
    return this;
  }
}

export class FractalSwarmPlanner {
  constructor({ branching = 3, maxDepth = 4, maxNodes = 100 } = {}) { this.branching = Math.max(1, branching); this.maxDepth = Math.max(0, maxDepth); this.maxNodes = Math.max(1, maxNodes); }
  plan(root, decomposer) {
    let nodeCount = 0, maxObservedDepth = 0;
    const visit = (node, depth) => {
      if (nodeCount >= this.maxNodes) return null; nodeCount++; maxObservedDepth = Math.max(maxObservedDepth, depth);
      const out = { ...clone(node), depth, children: [] };
      if (depth >= this.maxDepth || nodeCount >= this.maxNodes) return out;
      const children = (decomposer(node) ?? []).slice(0, this.branching);
      for (const child of children) { const next = visit(child, depth + 1); if (next) out.children.push(next); if (nodeCount >= this.maxNodes) break; }
      return out;
    };
    const tree = visit(root, 0); return { tree, nodeCount, maxObservedDepth, collapsed: true, bounded: true };
  }
}

function globRegex(pattern) {
  let out = '^';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]; if (c === '*' && pattern[i + 1] === '*') { out += '.*'; i++; }
    else if (c === '*') out += '[^/]*';
    else out += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(out + '$');
}
export class AutopoieticBoundary {
  constructor({ core = [], protectedPatterns = [] } = {}) { this.core = new Set(core); this.patterns = protectedPatterns.map(globRegex); }
  classify(path) { return this.core.has(path) || this.patterns.some(r => r.test(path)) ? 'CORE' : 'ENVIRONMENT'; }
  authorizeMutation(path, { approved = false } = {}) { const classification = this.classify(path); return { path, classification, allowed: classification !== 'CORE' || approved, alignmentBoundaryPreserved: classification !== 'CORE' || approved }; }
  manifest(files = {}) { return Object.fromEntries(Object.entries(files).map(([path, content]) => [path, createHash('sha256').update(String(content)).digest('hex')])); }
}

export class CrossModalFeatureSpace {
  constructor({ dimensions = 64 } = {}) { this.dimensions = dimensions; this.adapters = new Map(); }
  register(modality, adapter) { this.adapters.set(modality, adapter); }
  encode({ modality, value }) {
    const adapter = this.adapters.get(modality); if (!adapter) throw new Error(`No adapter for modality ${modality}`);
    const raw = adapter(value); if (!Array.isArray(raw)) throw new Error('adapter must return numeric array');
    const out = Array(this.dimensions).fill(0); for (let i = 0; i < Math.min(raw.length, this.dimensions); i++) out[i] = finite(raw[i]);
    const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1; return out.map(x => x / norm);
  }
  compare(a, b) { return { similarity: cosine(this.encode(a), this.encode(b)), zeroShotIsomorphismClaimed: false, method: 'adapter-canonical-space' }; }
}

export class ProofCarryingResult {
  generateKeyPair() { return generateKeyPairSync('ed25519'); }
  sign(payload, privateKey) {
    const serialized = canonicalJson(payload); const digest = createHash('sha256').update(serialized).digest('hex');
    const signature = cryptoSign(null, Buffer.from(serialized), privateKey).toString('base64');
    return { payload: clone(payload), digest, signature, algorithm: 'Ed25519', zeroKnowledge: false };
  }
  verify(attestation, publicKey) {
    const serialized = canonicalJson(attestation.payload); const digest = createHash('sha256').update(serialized).digest('hex');
    const signatureValid = cryptoVerify(null, Buffer.from(serialized), publicKey, Buffer.from(attestation.signature, 'base64'));
    return { valid: signatureValid && digest === attestation.digest, signatureValid, digestValid: digest === attestation.digest, zeroKnowledge: false };
  }
}

export class DiscreteAnnealer {
  constructor({ initialTemperature = 10, cooling = 0.95, steps = 100, minTemperature = 1e-6, random = Math.random } = {}) { this.initialTemperature = initialTemperature; this.cooling = cooling; this.steps = steps; this.minTemperature = minTemperature; this.random = random; }
  optimize(start, neighbors, energy) {
    let current = start, currentEnergy = finite(energy(current), Infinity), best = current, bestEnergy = currentEnergy, temperature = this.initialTemperature;
    const trajectory = [{ id: current, energy: currentEnergy, temperature }];
    for (let step = 0; step < this.steps && temperature > this.minTemperature; step++) {
      const options = neighbors(current) ?? []; if (!options.length) break;
      const candidate = options.length === 1 ? options[0] : options[Math.min(options.length - 1, Math.floor(this.random() * options.length))];
      const candidateEnergy = finite(energy(candidate), Infinity); const delta = candidateEnergy - currentEnergy;
      if (delta <= 0 || this.random() < Math.exp(-delta / Math.max(this.minTemperature, temperature))) { current = candidate; currentEnergy = candidateEnergy; }
      if (currentEnergy < bestEnergy) { best = current; bestEnergy = currentEnergy; }
      trajectory.push({ id: current, energy: currentEnergy, temperature }); temperature *= this.cooling;
    }
    return { best: { id: best, energy: bestEnergy }, final: { id: current, energy: currentEnergy }, trajectory, destructiveRuleBypass: false };
  }
}

export class AnticipatoryScenarioMemory {
  constructor({ filePath, threshold = 0.5, dimensions = 96, now = Date.now } = {}) { if (!filePath) throw new Error('filePath required'); this.filePath = filePath; this.threshold = threshold; this.dimensions = dimensions; this.now = now; }
  async put(item) { const s = await readJson(this.filePath, { version: 1, items: [] }); const stored = { ...clone(item), vector: semanticVector(item.signature, this.dimensions), createdAt: item.createdAt ?? new Date(this.now()).toISOString() }; s.items = s.items.filter(x => x.id !== stored.id); s.items.push(stored); await writeJson(this.filePath, s); return stored; }
  async recall(signature) { const s = await readJson(this.filePath, { version: 1, items: [] }); const q = semanticVector(signature, this.dimensions); const ranked = s.items.map(x => ({ ...x, similarity: cosine(q, x.vector) })).sort((a, b) => b.similarity - a.similarity); const hit = ranked[0]; return hit && hit.similarity >= this.threshold ? { ...hit, precomputed: true, futureKnown: false } : null; }
}

function deterministicBipolar(seed, symbol, dimensions) {
  const out = new Int8Array(dimensions); let block = Buffer.alloc(0), counter = 0;
  for (let i = 0; i < dimensions; i++) { if (i % 256 === 0) block = createHash('sha256').update(`${seed}\0${symbol}\0${counter++}`).digest(); const byte = block[(i >> 3) % block.length]; out[i] = ((byte >> (i & 7)) & 1) ? 1 : -1; }
  return out;
}
export class HyperdimensionalVSA {
  constructor({ dimensions = 10000, seed = 'omega-vsa' } = {}) { if (dimensions < 1000) throw new Error('dimensions must be >= 1000'); this.dimensions = dimensions; this.seed = seed; this.codebook = new Map(); }
  symbol(name) { if (!this.codebook.has(name)) this.codebook.set(name, deterministicBipolar(this.seed, name, this.dimensions)); return new Int8Array(this.codebook.get(name)); }
  bind(a, b) { const out = new Int8Array(this.dimensions); for (let i = 0; i < this.dimensions; i++) out[i] = a[i] * b[i]; return out; }
  bundle(vectors) { const sums = new Int32Array(this.dimensions); for (const v of vectors) for (let i = 0; i < this.dimensions; i++) sums[i] += v[i]; const out = new Int8Array(this.dimensions); for (let i = 0; i < this.dimensions; i++) out[i] = sums[i] >= 0 ? 1 : -1; return out; }
  permute(v, shift = 1) { const out = new Int8Array(this.dimensions); const s = ((shift % this.dimensions) + this.dimensions) % this.dimensions; for (let i = 0; i < this.dimensions; i++) out[(i + s) % this.dimensions] = v[i]; return out; }
  similarity(a, b) { let dot = 0; for (let i = 0; i < this.dimensions; i++) dot += a[i] * b[i]; return dot / this.dimensions; }
  corrupt(v, rate = 0.1, random = Math.random) { const out = new Int8Array(v); const salt = Math.floor(random() * 0xffffffff); for (let i = 0; i < out.length; i++) { const d = createHash('sha256').update(`${salt}:${i}`).digest(); const u = d.readUInt32BE(0) / 0xffffffff; if (u < rate) out[i] *= -1; } return out; }
  cleanup(v, symbols = [...this.codebook.keys()]) { const ranked = symbols.map(symbol => ({ symbol, score: this.similarity(v, this.symbol(symbol)) })).sort((a, b) => b.score - a.score); return ranked[0] ?? null; }
}

export class QasmCircuitBuilder {
  constructor({ qubits = 1 } = {}) { if (!Number.isInteger(qubits) || qubits < 1) throw new Error('qubits must be >=1'); this.qubits = qubits; this.ops = []; this.measured = false; }
  #q(i) { if (!Number.isInteger(i) || i < 0 || i >= this.qubits) throw new RangeError(`qubit ${i} out of range`); }
  h(i) { this.#q(i); this.ops.push(`h q[${i}];`); return this; }
  x(i) { this.#q(i); this.ops.push(`x q[${i}];`); return this; }
  cx(a, b) { this.#q(a); this.#q(b); if (a === b) throw new Error('control and target differ'); this.ops.push(`cx q[${a}], q[${b}];`); return this; }
  rz(theta, i) { this.#q(i); if (!Number.isFinite(theta)) throw new Error('theta must be finite'); this.ops.push(`rz(${theta}) q[${i}];`); return this; }
  measureAll() { this.measured = true; return this; }
  render() { const lines = ['OPENQASM 3.0;', `qubit[${this.qubits}] q;`, ...(this.measured ? [`bit[${this.qubits}] c;`] : []), ...this.ops, ...(this.measured ? [`c = measure q;`] : [])]; return { qasm: lines.join('\n') + '\n', qubits: this.qubits, quantumAdvantageClaimed: false, executionRequiredExternally: true }; }
}

export class InformationBottleneckMacroModel {
  constructor({ beta = 0.1 } = {}) { this.beta = beta; }
  compare(rows, mappings) {
    return mappings.map(mapping => {
      const zCounts = new Map(), yCounts = new Map(), joint = new Map();
      for (const row of rows) { const z = String(mapping.map(row.x)), y = String(row.y); zCounts.set(z, (zCounts.get(z) ?? 0) + 1); yCounts.set(y, (yCounts.get(y) ?? 0) + 1); joint.set(`${z}\0${y}`, (joint.get(`${z}\0${y}`) ?? 0) + 1); }
      const total = rows.length || 1; let mi = 0;
      for (const [key, count] of joint) { const [z, y] = key.split('\0'); const pxy = count / total, pz = zCounts.get(z) / total, py = yCounts.get(y) / total; mi += pxy * Math.log2(pxy / Math.max(EPS, pz * py)); }
      const complexity = entropyFromCounts(zCounts); const score = mi - this.beta * complexity;
      return { id: mapping.id, predictiveInformation: mi, macroComplexity: complexity, score };
    }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  }
}

export class NarsTruthEngine {
  constructor({ k = 1 } = {}) { this.k = k; }
  fromEvidence({ positive = 0, total = 0 }) { const t = Math.max(0, finite(total)); const p = clamp(finite(positive), 0, t); return { frequency: t ? p / t : 0.5, confidence: t / (t + this.k), evidence: t }; }
  revise(a, b) { const wa = a.confidence >= 1 ? 1e12 : a.confidence * this.k / Math.max(EPS, 1 - a.confidence); const wb = b.confidence >= 1 ? 1e12 : b.confidence * this.k / Math.max(EPS, 1 - b.confidence); const w = wa + wb; return { frequency: w ? (wa * a.frequency + wb * b.frequency) / w : 0.5, confidence: w / (w + this.k), evidence: w }; }
  choose(items) { return [...items].sort((a, b) => (b.truth.frequency * b.truth.confidence) - (a.truth.frequency * a.truth.confidence))[0] ?? null; }
}

export class PreferenceGovernance {
  evaluate({ action, preferences = [] } = {}) {
    const violations = []; let utility = 0;
    for (const p of preferences) { const v = finite(action?.attributes?.[p.key]); const weight = finite(p.weight, 1); let pass = true; if (p.min != null && v < p.min) pass = false; if (p.max != null && v > p.max) pass = false; if (!pass) violations.push({ key: p.key, value: v, min: p.min, max: p.max }); utility += (pass ? 1 : -1) * weight; }
    return { allowed: violations.length === 0, violations, utility, cevClaimed: false, basis: 'explicit-stakeholder-preferences' };
  }
}

export class RetrospectiveCorrectionLedger {
  constructor({ filePath } = {}) { if (!filePath) throw new Error('filePath required'); this.filePath = filePath; }
  async recordFailure(item) { const s = await readJson(this.filePath, { version: 1, failures: [] }); const signatureHash = createHash('sha256').update(String(item.signature)).digest('hex'); const stored = { ...clone(item), signatureHash, recordedAt: new Date().toISOString() }; s.failures.push(stored); await writeJson(this.filePath, s); return stored; }
  async evaluate(signature, { asOf = null } = {}) { const s = await readJson(this.filePath, { version: 1, failures: [] }); const hash = createHash('sha256').update(String(signature)).digest('hex'); const cutoff = asOf ? Date.parse(asOf) : Infinity; const matches = s.failures.filter(x => x.signatureHash === hash && Date.parse(x.recordedAt) <= cutoff); return { blocked: matches.length > 0, penalty: matches.length, failures: matches, retrocausalityClaimed: false, mechanism: 'bitemporal-retrospective-policy-correction' }; }
}
