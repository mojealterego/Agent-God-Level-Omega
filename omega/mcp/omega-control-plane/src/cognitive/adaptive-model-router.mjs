function finite(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }

export class AdaptiveModelRouter {
  constructor({ exploration = 0.15 } = {}) {
    this.exploration = finite(exploration, 0.15);
    this.models = new Map();
    this.totalObservations = 0;
  }

  registerModel({ id, capabilities = [], baseQuality = 0.5, costPerUnit = 0, maxComplexity = 1, metadata = {} }) {
    if (!id) throw new TypeError('id is required');
    const existing = this.models.get(id);
    this.models.set(id, {
      id,
      capabilities: [...new Set(capabilities)],
      baseQuality: finite(baseQuality, 0.5),
      costPerUnit: finite(costPerUnit, 0),
      maxComplexity: finite(maxComplexity, 1),
      metadata: { ...metadata },
      stats: existing?.stats ?? { count: 0, successes: 0, failures: 0, qualityCount: 0, meanQuality: 0, meanLatencyMs: 0, meanCost: 0 }
    });
    return this.models.get(id);
  }

  observe({ id, success, quality = 0, latencyMs = 0, cost = null }) {
    const model = this.models.get(id);
    if (!model) throw new Error(`Unknown model: ${id}`);
    const s = model.stats;
    const next = s.count + 1;
    const update = (old, value, n) => old + (finite(value, 0) - old) / n;
    s.count = next;
    success ? s.successes += 1 : s.failures += 1;
    if (quality !== null && quality !== undefined) {
      s.qualityCount = (s.qualityCount ?? 0) + 1;
      s.meanQuality = update(s.meanQuality, quality, s.qualityCount);
    }
    s.meanLatencyMs = update(s.meanLatencyMs, latencyMs, next);
    s.meanCost = update(s.meanCost, cost === null ? model.costPerUnit : cost, next);
    this.totalObservations += 1;
    return { id, stats: { ...s } };
  }

  #estimate(model) {
    const s = model.stats;
    return {
      quality: (s.qualityCount ?? 0) ? s.meanQuality : model.baseQuality,
      latency: s.count ? s.meanLatencyMs : 0,
      cost: s.count ? s.meanCost : model.costPerUnit,
      reliability: s.count ? s.successes / s.count : 1,
      exploration: this.exploration * Math.sqrt(Math.log(this.totalObservations + 2) / (s.count + 1))
    };
  }

  route({ capability, complexity = 0, minQuality = 0, budget = Number.POSITIVE_INFINITY, weights = {} }) {
    const w = { quality: 1, latency: 0.001, cost: 0.2, reliability: 1, exploration: 1, ...weights };
    const candidates = [...this.models.values()].map((model) => ({ model, estimate: this.#estimate(model) }))
      .filter(({ model }) => model.capabilities.includes(capability))
      .filter(({ model }) => model.maxComplexity >= complexity)
      .filter(({ estimate }) => estimate.quality >= minQuality)
      .filter(({ estimate }) => estimate.cost <= budget)
      .map(({ model, estimate }) => ({
        ...model,
        estimate,
        score: estimate.quality * w.quality + estimate.reliability * w.reliability + estimate.exploration * w.exploration - estimate.latency * w.latency - estimate.cost * w.cost
      }))
      .sort((a, b) => b.score - a.score || a.estimate.cost - b.estimate.cost || a.id.localeCompare(b.id));
    if (!candidates.length) throw new Error('No eligible model satisfies capability, quality, complexity and budget constraints');
    return candidates[0];
  }

  snapshot() {
    return { exploration: this.exploration, totalObservations: this.totalObservations, models: [...this.models.values()].map((m) => ({ ...m, capabilities: [...m.capabilities], stats: { ...m.stats } })) };
  }

  static fromSnapshot(snapshot, options = {}) {
    const router = new AdaptiveModelRouter({ exploration: options.exploration ?? snapshot?.exploration ?? 0.15 });
    router.totalObservations = snapshot?.totalObservations ?? 0;
    for (const item of snapshot?.models ?? []) router.models.set(item.id, { ...item, capabilities: [...item.capabilities], stats: { qualityCount: item.stats?.qualityCount ?? (item.stats?.count ?? 0), ...item.stats } });
    return router;
  }
}
