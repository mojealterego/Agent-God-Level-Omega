export class ReflexionLoop {
  constructor({ memory }) {
    if (!memory) throw new TypeError('memory is required');
    this.memory = memory;
  }

  async record({ taskId, attempt, action, outcome, lesson, txTime, metadata = {} }) {
    const quality = outcome === 'success' ? 1 : outcome === 'partial' ? 0.6 : 0.35;
    const id = `reflexion:${taskId}:${attempt}`;
    await this.memory.rememberEpisode({
      id,
      text: `${action}. ${lesson}`,
      outcome,
      txTime,
      metadata: { ...metadata, taskId, attempt, lesson, quality, kind: 'reflexion' }
    });
    return { id, quality };
  }

  async lessons(query, options = {}) {
    const episodes = await this.memory.recallEpisodes(query, options);
    return episodes
      .filter((x) => x.metadata?.kind === 'reflexion')
      .map((x) => ({ ...x, quality: x.metadata.quality ?? 0 }))
      .sort((a, b) => b.quality - a.quality || String(b.id).localeCompare(String(a.id)));
  }
}
