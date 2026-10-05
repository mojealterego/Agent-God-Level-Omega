function terms(text) {
  return new Set(String(text).toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []);
}

function overlap(a, b) {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const x of a) if (b.has(x)) n += 1;
  return n / Math.sqrt(a.size * b.size);
}

export class ShimiIndex {
  constructor() {
    this.items = new Map();
    this.hierarchy = new Map();
  }

  add({ id, path = [], text, metadata = {} }) {
    if (!id || !text) throw new TypeError('id and text are required');
    const normalizedPath = path.map((x) => String(x).toLowerCase());
    const item = { id, path: normalizedPath, text, metadata, textTerms: terms(text), pathTerms: terms(normalizedPath.join(' ')) };
    this.items.set(id, item);
    for (let i = 1; i <= normalizedPath.length; i += 1) {
      const key = normalizedPath.slice(0, i).join('/');
      if (!this.hierarchy.has(key)) this.hierarchy.set(key, new Set());
      this.hierarchy.get(key).add(id);
    }
    return { id, path: normalizedPath, text, metadata };
  }

  search(query, { limit = 10 } = {}) {
    const q = terms(query);
    return [...this.items.values()]
      .map((item) => {
        const semantic = overlap(q, item.textTerms);
        const hierarchy = overlap(q, item.pathTerms);
        const exactBoost = [...q].filter((t) => item.text.toLowerCase().includes(t)).length / Math.max(1, q.size);
        return {
          id: item.id,
          path: item.path,
          text: item.text,
          metadata: item.metadata,
          score: semantic * 0.55 + hierarchy * 0.3 + exactBoost * 0.15
        };
      })
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, limit);
  }
}
