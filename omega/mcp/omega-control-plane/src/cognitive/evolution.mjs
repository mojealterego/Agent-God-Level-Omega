function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export class DigitalGenotype {
  constructor({ id, genes, parentId = null, mutation = null, generation = 0 }) {
    if (!id || !genes || typeof genes !== 'object') throw new TypeError('id and genes are required');
    this.id = id;
    this.genes = clone(genes);
    this.parentId = parentId;
    this.mutation = mutation;
    this.generation = generation;
    Object.freeze(this.genes);
  }

  mutate({ id, changes }) {
    if (!id || !changes || typeof changes !== 'object') throw new TypeError('id and changes are required');
    return new DigitalGenotype({
      id,
      genes: { ...this.genes, ...clone(changes) },
      parentId: this.id,
      mutation: clone(changes),
      generation: this.generation + 1
    });
  }
}

function dominates(a, b) {
  const keys = Object.keys(a);
  let strictly = false;
  for (const key of keys) {
    if (!(key in b)) continue;
    const lowerIsBetter = /latency|cost|memory|complexity|size|energy/i.test(key);
    if (lowerIsBetter) {
      if (a[key] > b[key]) return false;
      if (a[key] < b[key]) strictly = true;
    } else {
      if (a[key] < b[key]) return false;
      if (a[key] > b[key]) strictly = true;
    }
  }
  return strictly;
}

export class EvolutionArchive {
  constructor() {
    this.entries = new Map();
  }

  addBaseline(genotype, fitness) {
    this.entries.set(genotype.id, { genotype, fitness: clone(fitness), admitted: true, reason: 'baseline' });
    return this.entries.get(genotype.id);
  }

  evaluate(genotype, fitness, { hardGates = [] } = {}) {
    if (genotype.parentId && !this.entries.has(genotype.parentId)) throw new Error(`Unknown parent genotype: ${genotype.parentId}`);
    const failedGate = hardGates.find((key) => !fitness[key]);
    const admitted = !failedGate;
    const entry = {
      genotype,
      fitness: clone(fitness),
      admitted,
      reason: failedGate ? `hard-gate:${failedGate}` : 'eligible'
    };
    this.entries.set(genotype.id, entry);
    return entry;
  }

  lineage(id) {
    const out = [];
    let current = this.entries.get(id);
    while (current) {
      out.unshift(current.genotype);
      current = current.genotype.parentId ? this.entries.get(current.genotype.parentId) : null;
    }
    return out;
  }

  paretoFront() {
    const eligible = [...this.entries.values()].filter((e) => e.admitted);
    return eligible.filter((candidate) =>
      !eligible.some((other) => other !== candidate && dominates(other.fitness, candidate.fitness))
    );
  }

  snapshot() {
    return [...this.entries.values()].map((entry) => ({
      genotype: {
        id: entry.genotype.id,
        genes: clone(entry.genotype.genes),
        parentId: entry.genotype.parentId,
        mutation: clone(entry.genotype.mutation),
        generation: entry.genotype.generation
      },
      fitness: clone(entry.fitness),
      admitted: entry.admitted,
      reason: entry.reason
    }));
  }

  static fromSnapshot(snapshot = []) {
    const archive = new EvolutionArchive();
    for (const entry of snapshot) {
      const genotype = new DigitalGenotype(entry.genotype);
      archive.entries.set(genotype.id, { genotype, fitness: clone(entry.fitness), admitted: Boolean(entry.admitted), reason: entry.reason });
    }
    return archive;
  }
}
