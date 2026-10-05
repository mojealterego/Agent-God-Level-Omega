function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

function parseMetrics(stdout) {
  const lines = String(stdout ?? '').trim().split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const value = JSON.parse(lines[i]);
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch {}
  }
  return {};
}

function numericMean(samples, key) {
  const vals = samples.map((s) => s.metrics[key]).filter(Number.isFinite);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
}

export class BenchmarkHarness {
  constructor({ runner, clock = () => Date.now() } = {}) {
    if (typeof runner !== 'function') throw new TypeError('runner is required');
    this.runner = runner;
    this.clock = clock;
  }

  async evaluate({ candidate, repetitions = 5, warmups = 1, hardGates = [] }) {
    if (!candidate?.id) throw new TypeError('candidate.id is required');
    if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 100) throw new RangeError('repetitions must be 1..100');
    if (!Number.isInteger(warmups) || warmups < 0 || warmups > 20) throw new RangeError('warmups must be 0..20');
    for (let i = 0; i < warmups; i += 1) await this.runner({ candidate, iteration: -(i + 1), warmup: true });
    const samples = [];
    for (let i = 0; i < repetitions; i += 1) {
      const started = this.clock();
      const result = await this.runner({ candidate, iteration: i, warmup: false });
      const durationMs = Number.isFinite(result.durationMs) ? result.durationMs : Math.max(0, this.clock() - started);
      samples.push({ exitCode: result.exitCode, durationMs, metrics: parseMetrics(result.stdout), stderr: result.stderr ?? '' });
    }
    const gateFailures = [];
    for (const gate of hardGates) {
      if (!samples.every((s) => s.exitCode === 0 && Boolean(s.metrics[gate]))) gateFailures.push(gate);
    }
    if (samples.some((s) => s.exitCode !== 0) && !gateFailures.includes('process-exit')) gateFailures.push('process-exit');
    const durations = samples.map((s) => s.durationMs);
    const metricKeys = [...new Set(samples.flatMap((s) => Object.keys(s.metrics)))];
    const aggregate = {};
    for (const key of metricKeys) {
      const mean = numericMean(samples, key);
      if (mean !== undefined) aggregate[key] = mean;
    }
    return {
      candidateId: candidate.id,
      admitted: gateFailures.length === 0,
      failedGates: gateFailures,
      metrics: {
        samples: samples.length,
        meanDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
        p50DurationMs: percentile(durations, 0.5),
        p95DurationMs: percentile(durations, 0.95),
        ...aggregate
      },
      samples
    };
  }
}
