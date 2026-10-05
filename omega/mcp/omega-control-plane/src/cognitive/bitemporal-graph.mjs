export class BitemporalGraphMemory {
  constructor({ store }) {
    if (!store) throw new TypeError('store is required');
    this.store = store;
  }

  async upsertNode({ id, value = {}, ...time }) {
    if (!id) throw new TypeError('id is required');
    return await this.store.assertFact({
      key: `node:${id}`,
      value: { id, ...value },
      ...time,
      metadata: { kind: 'graph-node' }
    });
  }

  async link({ id, from, to, relation, value = {}, ...time }) {
    if (!id || !from || !to || !relation) throw new TypeError('id, from, to and relation are required');
    return await this.store.assertFact({
      key: `edge:${id}`,
      value: { id, from, to, relation, ...value },
      ...time,
      metadata: { kind: 'graph-edge' }
    });
  }

  async node({ id, validAt, transactionAt }) {
    const hits = await this.store.query({ key: `node:${id}`, validAt, transactionAt });
    return hits.at(-1)?.value ?? null;
  }

  async neighbors({ id, relation, direction = 'out', validAt, transactionAt }) {
    const edges = await this.store.query({
      validAt,
      transactionAt,
      predicate: (e) => e.metadata?.kind === 'graph-edge' &&
        (!relation || e.value?.relation === relation) &&
        (
          direction === 'both' ? (e.value?.from === id || e.value?.to === id) :
          direction === 'in' ? e.value?.to === id :
          e.value?.from === id
        )
    });
    const out = [];
    for (const edge of edges) {
      const other = direction === 'in'
        ? edge.value.from
        : direction === 'both'
          ? (edge.value.from === id ? edge.value.to : edge.value.from)
          : edge.value.to;
      const node = await this.node({ id: other, validAt, transactionAt });
      if (node) out.push({ edgeId: edge.value.id, relation: edge.value.relation, node, edge: edge.value });
    }
    return out;
  }
}
