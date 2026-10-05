import { randomUUID } from 'node:crypto';

function betaSampleApprox(alpha, beta, random) {
  const mean = alpha / (alpha + beta);
  const noise = (random() - 0.5) * Math.min(0.25, 1 / Math.sqrt(alpha + beta));
  return Math.max(0, Math.min(1, mean + noise));
}

export class ABMCTSScheduler {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.nodes = new Map();
    this.posteriors = {
      WIDEN: { alpha: 1, beta: 1, successes: 0, failures: 0 },
      DEEPEN: { alpha: 1, beta: 1, successes: 0, failures: 0 }
    };
  }

  createRoot({ id = randomUUID(), payload = {} } = {}) {
    const node = { id, parentId: null, action: null, reward: null, payload, children: [] };
    this.nodes.set(id, node);
    return node;
  }

  nextAction(nodeId) {
    if (!this.nodes.has(nodeId)) throw new Error(`Unknown node: ${nodeId}`);
    const w = betaSampleApprox(this.posteriors.WIDEN.alpha, this.posteriors.WIDEN.beta, this.random);
    const d = betaSampleApprox(this.posteriors.DEEPEN.alpha, this.posteriors.DEEPEN.beta, this.random);
    return { type: w >= d ? 'WIDEN' : 'DEEPEN', samples: { WIDEN: w, DEEPEN: d } };
  }

  observe({ parentId, action, candidateId = randomUUID(), reward, payload = {} }) {
    if (!this.nodes.has(parentId)) throw new Error(`Unknown parent: ${parentId}`);
    if (!['WIDEN', 'DEEPEN'].includes(action)) throw new Error(`Unknown action: ${action}`);
    if (!Number.isFinite(reward) || reward < 0 || reward > 1) throw new RangeError('reward must be between 0 and 1');
    const posterior = this.posteriors[action];
    if (reward >= 0.5) {
      posterior.alpha += reward;
      posterior.successes += 1;
    } else {
      posterior.beta += 1 - reward;
      posterior.failures += 1;
    }
    const child = { id: candidateId, parentId, action, reward, payload, children: [] };
    this.nodes.set(candidateId, child);
    this.nodes.get(parentId).children.push(candidateId);
    return child;
  }

  snapshot() {
    return {
      nodes: [...this.nodes.values()].map((n) => ({ ...n, children: [...n.children] })),
      posteriors: {
        WIDEN: { ...this.posteriors.WIDEN },
        DEEPEN: { ...this.posteriors.DEEPEN }
      }
    };
  }

  static fromSnapshot(snapshot = {}, options = {}) {
    const scheduler = new ABMCTSScheduler(options);
    scheduler.nodes.clear();
    for (const node of snapshot.nodes ?? []) scheduler.nodes.set(node.id, { ...node, children: [...(node.children ?? [])] });
    if (snapshot.posteriors?.WIDEN) scheduler.posteriors.WIDEN = { ...snapshot.posteriors.WIDEN };
    if (snapshot.posteriors?.DEEPEN) scheduler.posteriors.DEEPEN = { ...snapshot.posteriors.DEEPEN };
    return scheduler;
  }
}
