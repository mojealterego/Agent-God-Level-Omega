export class ReasoningRouter {
  constructor() {
    this.models = new Map();
  }

  registerModel({ id, capabilities = [], quality, costPerUnit, maxComplexity = 1, metadata = {} }) {
    if (!id) throw new TypeError('id is required');
    this.models.set(id, {
      id,
      capabilities: new Set(capabilities),
      quality: Number(quality),
      costPerUnit: Number(costPerUnit),
      maxComplexity: Number(maxComplexity),
      metadata
    });
  }

  route({ capability, complexity, minQuality = 0, budget = Number.POSITIVE_INFINITY }) {
    const c = Number(complexity);
    const candidates = [...this.models.values()]
      .filter((m) => m.capabilities.has(capability))
      .filter((m) => m.quality >= minQuality)
      .filter((m) => m.maxComplexity >= c)
      .filter((m) => m.costPerUnit <= budget)
      .sort((a, b) => a.costPerUnit - b.costPerUnit || b.quality - a.quality || a.id.localeCompare(b.id));
    if (!candidates.length) throw new Error('No eligible model satisfies capability, quality, complexity and budget constraints');
    const chosen = candidates[0];
    return { ...chosen, capabilities: [...chosen.capabilities] };
  }
}
