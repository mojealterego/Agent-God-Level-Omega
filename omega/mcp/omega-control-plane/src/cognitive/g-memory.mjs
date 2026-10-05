import { randomUUID } from 'node:crypto';

function tokens(text) {
  return new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []);
}

function similarity(query, text) {
  const q = tokens(query);
  const t = tokens(text);
  if (!q.size || !t.size) return 0;
  let intersection = 0;
  for (const x of q) if (t.has(x)) intersection += 1;
  return intersection / q.size;
}

export class GMemory {
  constructor() {
    this.interactions = new Map();
    this.queries = new Map();
    this.insights = new Map();
  }

  recordInteraction({ id = randomUUID(), agents = [], text, metadata = {} }) {
    const item = { id, tier: 'interaction', agents, text, metadata };
    this.interactions.set(id, item);
    return item;
  }

  recordQuery({ id = randomUUID(), text, interactionIds = [], metadata = {} }) {
    for (const ref of interactionIds) if (!this.interactions.has(ref)) throw new Error(`Unknown interaction: ${ref}`);
    const item = { id, tier: 'query', text, interactionIds, metadata };
    this.queries.set(id, item);
    return item;
  }

  recordInsight({ id = randomUUID(), text, queryIds = [], metadata = {} }) {
    for (const ref of queryIds) if (!this.queries.has(ref)) throw new Error(`Unknown query: ${ref}`);
    const item = { id, tier: 'insight', text, queryIds, metadata };
    this.insights.set(id, item);
    return item;
  }

  retrieve(query, { limit = 10 } = {}) {
    const weighted = [
      ...[...this.insights.values()].map((x) => ({ ...x, tierWeight: 1.3 })),
      ...[...this.queries.values()].map((x) => ({ ...x, tierWeight: 1.1 })),
      ...[...this.interactions.values()].map((x) => ({ ...x, tierWeight: 1 }))
    ];
    return weighted
      .map((x) => ({ ...x, score: similarity(query, x.text) * x.tierWeight }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit);
  }
}
