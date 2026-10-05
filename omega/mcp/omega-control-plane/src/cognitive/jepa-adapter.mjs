function normalizedMse(predicted, target) {
  if (!Array.isArray(predicted) || !Array.isArray(target) || predicted.length !== target.length || predicted.length === 0) {
    throw new TypeError('predicted and target must be non-empty arrays of equal length');
  }
  let squared = 0;
  let scale = 0;
  for (let i = 0; i < target.length; i += 1) {
    const p = Number(predicted[i]);
    const t = Number(target[i]);
    if (!Number.isFinite(p) || !Number.isFinite(t)) throw new TypeError('latent vectors must be finite numbers');
    squared += (p - t) ** 2;
    scale += t ** 2;
  }
  return squared / Math.max(1, scale);
}

export class JepaPredictiveAdapter {
  constructor({ predictor, provider = 'injected-predictor' } = {}) {
    if (typeof predictor !== 'function') throw new TypeError('A real predictor function must be injected');
    this.predictor = predictor;
    this.provider = provider;
  }

  async evaluate({ context, target, action = null, metadata = {} }) {
    const predicted = await this.predictor({ context, action, metadata });
    return {
      provider: this.provider,
      predicted,
      target,
      error: normalizedMse(predicted, target)
    };
  }
}
