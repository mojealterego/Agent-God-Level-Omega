function normalizeScore(score) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(1, (score + 1) / 2));
}

export class HybridRagEngine {
  constructor({ coala, gMemory, holographic }) {
    this.coala = coala;
    this.gMemory = gMemory;
    this.holographic = holographic;
  }

  async retrieve(query, { limit = 10, validAt, transactionAt } = {}) {
    const [episodes, semantic] = await Promise.all([
      this.coala ? this.coala.recallEpisodes(query, { validAt, transactionAt, limit }) : [],
      Promise.resolve(this.coala ? this.coala.recallSemantic(query, { limit }) : [])
    ]);
    const graph = this.gMemory ? this.gMemory.retrieve(query, { limit }) : [];
    const hdc = this.holographic
      ? this.holographic.search(String(query).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [], { limit })
      : [];

    const fused = [
      ...episodes.map((x, i) => ({ source: 'episodic', id: x.id, text: x.text, score: 1 - i * 0.03, payload: x })),
      ...semantic.map((x) => ({ source: 'semantic', id: x.id, text: x.text, score: x.score, payload: x })),
      ...graph.map((x) => ({ source: `g-memory:${x.tier}`, id: x.id, text: x.text, score: Math.min(1, x.score), payload: x })),
      ...hdc.map((x) => ({ source: 'holographic', id: x.id, text: x.tokens.join(' '), score: normalizeScore(x.score), payload: x }))
    ];

    const best = new Map();
    for (const item of fused) {
      const key = `${item.source}:${item.id}`;
      if (!best.has(key) || best.get(key).score < item.score) best.set(key, item);
    }
    return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
