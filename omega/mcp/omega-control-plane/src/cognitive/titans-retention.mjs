export class TitansRetentionController {
  constructor({ decay = 0.98, momentum = 0.9, threshold = 0.5 } = {}) {
    if (!(decay > 0 && decay <= 1)) throw new RangeError('decay must be in (0,1]');
    if (!(momentum >= 0 && momentum < 1)) throw new RangeError('momentum must be in [0,1)');
    if (!(threshold >= 0)) throw new RangeError('threshold must be >= 0');
    this.decay = decay;
    this.momentum = momentum;
    this.threshold = threshold;
    this.entries = new Map();
  }

  observe({ id, predictionLoss, importance = 1, metadata = {} }) {
    if (!id) throw new TypeError('id is required');
    const loss = Number(predictionLoss);
    const imp = Number(importance);
    if (!Number.isFinite(loss) || loss < 0 || !Number.isFinite(imp) || imp < 0) {
      throw new TypeError('predictionLoss and importance must be finite non-negative numbers');
    }
    const previous = this.entries.get(id)?.score ?? 0;
    const surprise = loss * imp;
    const score = previous * this.momentum + surprise * (1 - this.momentum);
    const entry = { id, score, surprise, retain: score >= this.threshold, metadata };
    this.entries.set(id, entry);
    return { ...entry };
  }

  decayAll() {
    for (const [id, entry] of this.entries) {
      const score = entry.score * this.decay;
      this.entries.set(id, { ...entry, score, retain: score >= this.threshold });
    }
    return [...this.entries.values()].map((x) => ({ ...x }));
  }
}
