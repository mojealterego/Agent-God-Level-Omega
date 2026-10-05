export class GraphOfThoughtEngine {
  constructor() {
    this.nodes = new Map();
    this.children = new Map();
  }

  addThought({ id, content, score = 0, parents = [], metadata = {} }) {
    if (!id) throw new TypeError('id is required');
    if (this.nodes.has(id)) throw new Error(`Thought already exists: ${id}`);
    const node = { id, content, score, parents: [], metadata };
    this.nodes.set(id, node);
    this.children.set(id, new Set());
    for (const parent of parents) this.connect(parent, id);
    return this.nodes.get(id);
  }

  #reachable(from, target, seen = new Set()) {
    if (from === target) return true;
    if (seen.has(from)) return false;
    seen.add(from);
    for (const child of this.children.get(from) ?? []) {
      if (this.#reachable(child, target, seen)) return true;
    }
    return false;
  }

  connect(parentId, childId) {
    if (!this.nodes.has(parentId) || !this.nodes.has(childId)) throw new Error('Both thoughts must exist');
    if (this.#reachable(childId, parentId)) throw new Error('Graph of Thought cycle detected');
    this.children.get(parentId).add(childId);
    const child = this.nodes.get(childId);
    if (!child.parents.includes(parentId)) child.parents.push(parentId);
    return child;
  }

  updateScore(id, score) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown thought: ${id}`);
    node.score = score;
    return node;
  }

  frontier({ limit = 10 } = {}) {
    return [...this.nodes.values()]
      .filter((n) => (this.children.get(n.id)?.size ?? 0) === 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit);
  }

  aggregate(id) {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown thought: ${id}`);
    const parents = node.parents.map((p) => this.nodes.get(p));
    return { ...node, parentContents: parents.map((p) => p.content), parentScoreMean: parents.length ? parents.reduce((s, p) => s + p.score, 0) / parents.length : null };
  }

  snapshot() {
    return [...this.nodes.values()].map((x) => ({ ...x, children: [...(this.children.get(x.id) ?? [])] }));
  }

  static fromSnapshot(snapshot = []) {
    const graph = new GraphOfThoughtEngine();
    for (const item of snapshot) {
      graph.nodes.set(item.id, { id: item.id, content: item.content, score: item.score ?? 0, parents: [...(item.parents ?? [])], metadata: item.metadata ?? {} });
      graph.children.set(item.id, new Set(item.children ?? []));
    }
    return graph;
  }
}
