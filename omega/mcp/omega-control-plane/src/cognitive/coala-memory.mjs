import { ShimiIndex } from './shimi-index.mjs';

function containsText(value, query) {
  return JSON.stringify(value).toLowerCase().includes(String(query).toLowerCase());
}

export class CoalaMemory {
  constructor({ episodicStore, workingLimit = 32, semanticIndex = new ShimiIndex() } = {}) {
    if (!episodicStore) throw new TypeError('episodicStore is required');
    this.episodicStore = episodicStore;
    this.workingLimit = workingLimit;
    this.semanticIndex = semanticIndex;
    this.working = [];
    this.procedures = new Map();
  }

  rememberWorking(item) {
    this.working.push(item);
    if (this.working.length > this.workingLimit) this.working.splice(0, this.working.length - this.workingLimit);
    return item;
  }

  async rememberEpisode({ id, text, outcome = null, validFrom, validTo, txTime, metadata = {} }) {
    return await this.episodicStore.assertFact({
      assertionId: id,
      key: `episode:${id}`,
      value: { id, text, outcome, metadata },
      validFrom: validFrom ?? txTime,
      validTo,
      txTime,
      metadata: { kind: 'episodic' }
    });
  }

  async recallEpisodes(query, { validAt, transactionAt, limit = 10 } = {}) {
    const rows = await this.episodicStore.query({
      validAt,
      transactionAt,
      predicate: (e) => e.metadata?.kind === 'episodic' && containsText(e.value, query)
    });
    return rows.slice(-limit).reverse().map((e) => ({ ...e.value, assertionId: e.assertionId, txTime: e.txTime }));
  }

  rememberProcedure({ id, trigger, steps, metadata = {} }) {
    const item = { id, trigger, steps, metadata };
    this.procedures.set(id, item);
    return item;
  }

  recallProcedures(query, { limit = 10 } = {}) {
    const q = String(query).toLowerCase();
    return [...this.procedures.values()]
      .filter((p) => JSON.stringify(p).toLowerCase().includes(q))
      .slice(0, limit);
  }

  rememberSemantic({ id, path, text, metadata = {} }) {
    return this.semanticIndex.add({ id, path, text, metadata });
  }

  recallSemantic(query, { limit = 10 } = {}) {
    return this.semanticIndex.search(query, { limit });
  }
}
