import { createHash, randomUUID } from 'node:crypto';

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

export function sha256Json(value) {
  const serialized = JSON.stringify(stableValue(value));
  return createHash('sha256').update(serialized).digest('hex');
}

export function createEvidence(kind, payload, { observedAt = new Date().toISOString() } = {}) {
  const canonical = { kind, observedAt, payload };
  return {
    id: randomUUID(),
    kind,
    observedAt,
    sha256: sha256Json(canonical)
  };
}
