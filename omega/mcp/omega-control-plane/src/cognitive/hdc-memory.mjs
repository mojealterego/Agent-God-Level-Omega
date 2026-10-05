import { createHash } from 'node:crypto';

function normalizedTokens(tokens) {
  return [...new Set(tokens.map((t) => String(t).toLowerCase().trim()).filter(Boolean))].sort();
}

function hashBytes(seed, token) {
  return createHash('sha256').update(`${seed}\u0000${token}`).digest();
}

function baseVector(seed, token, dimensions) {
  const bytes = hashBytes(seed, token);
  const v = new Int8Array(dimensions);
  for (let i = 0; i < dimensions; i += 1) {
    const byte = bytes[i % bytes.length];
    const bit = (byte >> (i % 8)) & 1;
    v[i] = bit ? 1 : -1;
  }
  return v;
}

function bundle(vectors, dimensions) {
  const sums = new Int32Array(dimensions);
  for (const v of vectors) for (let i = 0; i < dimensions; i += 1) sums[i] += v[i];
  const result = new Int8Array(dimensions);
  for (let i = 0; i < dimensions; i += 1) result[i] = sums[i] >= 0 ? 1 : -1;
  return result;
}

function cosineBipolar(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot / a.length;
}

export class HolographicMemory {
  constructor({ dimensions = 2048, seed = 'omega-hdc' } = {}) {
    if (!Number.isInteger(dimensions) || dimensions < 64) throw new RangeError('dimensions must be >= 64');
    this.dimensions = dimensions;
    this.seed = seed;
    this.items = new Map();
  }

  encode(tokens) {
    const clean = normalizedTokens(tokens);
    if (clean.length === 0) return new Int8Array(this.dimensions);
    return bundle(clean.map((token) => baseVector(this.seed, token, this.dimensions)), this.dimensions);
  }

  bind(left, right) {
    if (left.length !== right.length) throw new Error('Vector dimensions differ');
    const out = new Int8Array(left.length);
    for (let i = 0; i < left.length; i += 1) out[i] = left[i] * right[i];
    return out;
  }

  store(id, tokens, metadata = {}) {
    const vector = this.encode(tokens);
    const item = { id, tokens: normalizedTokens(tokens), vector, metadata };
    this.items.set(id, item);
    return { id, tokens: item.tokens, metadata };
  }

  search(tokens, { limit = 10 } = {}) {
    const query = this.encode(tokens);
    return [...this.items.values()]
      .map((item) => ({ id: item.id, score: cosineBipolar(query, item.vector), metadata: item.metadata, tokens: item.tokens }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit);
  }
}
