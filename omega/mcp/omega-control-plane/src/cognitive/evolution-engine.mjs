import { DigitalGenotype, EvolutionArchive } from './evolution.mjs';

export { DigitalGenotype };

function numericObjective(entry, objective) {
  const value = entry?.fitness?.[objective];
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

export class AlphaEvolveEngine {
  constructor({ maxIterations = 8, generate, evaluate } = {}) {
    if (!Number.isInteger(maxIterations) || maxIterations < 1) throw new RangeError('maxIterations must be a positive integer');
    if (typeof generate !== 'function' || typeof evaluate !== 'function') throw new TypeError('generate and evaluate callbacks are required');
    this.maxIterations = maxIterations;
    this.generate = generate;
    this.evaluate = evaluate;
  }

  async run({ baseline, baselineFitness = null, hardGates = [], objective }) {
    const archive = new EvolutionArchive();
    const baseFitness = baselineFitness ?? await this.evaluate(baseline, { iteration: 0, parent: null });
    archive.addBaseline(baseline, baseFitness);
    let parent = baseline;
    let best = archive.entries.get(baseline.id);

    for (let iteration = 1; iteration <= this.maxIterations; iteration += 1) {
      const candidate = await this.generate({ parent, iteration, archive });
      if (!(candidate instanceof DigitalGenotype)) throw new TypeError('generate must return DigitalGenotype');
      const fitness = await this.evaluate(candidate, { iteration, parent, archive });
      const entry = archive.evaluate(candidate, fitness, { hardGates });

      if (entry.admitted && numericObjective(entry, objective) >= numericObjective(best, objective)) {
        best = entry;
        parent = candidate;
      }
    }

    return { iterations: this.maxIterations, best, archive };
  }
}

export class RecursiveSelfImprovementController {
  constructor({ improvementMargin = 0.01, maxGenerations = 8 } = {}) {
    this.improvementMargin = improvementMargin;
    this.maxGenerations = maxGenerations;
    this.archive = new EvolutionArchive();
    this.current = null;
    this.generation = 0;
  }

  seed(genotype, fitness) {
    this.archive.addBaseline(genotype, fitness);
    this.current = genotype;
    this.generation = genotype.generation ?? 0;
  }

  consider(candidate, fitness, { hardGates = [], objective }) {
    if (!this.current) throw new Error('Seed baseline before considering mutations');
    if (this.generation >= this.maxGenerations) return { adopted: false, reason: 'generation-budget-exhausted' };

    const entry = this.archive.evaluate(candidate, fitness, { hardGates });
    if (!entry.admitted) return { adopted: false, reason: entry.reason, entry };

    const currentEntry = this.archive.entries.get(this.current.id);
    const oldScore = numericObjective(currentEntry, objective);
    const newScore = numericObjective(entry, objective);
    if (!(newScore >= oldScore + this.improvementMargin)) {
      return { adopted: false, reason: 'insufficient-improvement', entry, oldScore, newScore };
    }

    this.current = candidate;
    this.generation += 1;
    return { adopted: true, reason: 'verified-improvement', entry, oldScore, newScore };
  }
}
