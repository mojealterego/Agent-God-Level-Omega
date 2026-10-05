export class McpGateway {
  constructor({ failureThreshold = 3, cooldownMs = 30_000, clock = () => Date.now() } = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.clock = clock;
    this.providers = new Map();
  }

  register({ id, capabilities = [], priority = 0, invoke }) {
    if (!id || typeof invoke !== 'function') throw new TypeError('id and invoke are required');
    this.providers.set(id, {
      id,
      capabilities: new Set(capabilities),
      priority,
      invoke,
      failures: 0,
      openedAt: null
    });
    return id;
  }

  #healthy(provider) {
    if (provider.openedAt === null) return true;
    if (this.clock() - provider.openedAt >= this.cooldownMs) {
      provider.failures = 0;
      provider.openedAt = null;
      return true;
    }
    return false;
  }

  status() {
    return [...this.providers.values()].map((p) => ({
      id: p.id,
      capabilities: [...p.capabilities],
      priority: p.priority,
      failures: p.failures,
      circuit: this.#healthy(p) ? 'CLOSED' : 'OPEN'
    }));
  }

  async invoke(capability, operation, input, { providerId } = {}) {
    const candidates = [...this.providers.values()]
      .filter((p) => (!providerId || p.id === providerId) && p.capabilities.has(capability))
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

    let lastError = null;
    for (const provider of candidates) {
      if (!this.#healthy(provider)) continue;
      try {
        const result = await provider.invoke(operation, input);
        provider.failures = 0;
        provider.openedAt = null;
        return { providerId: provider.id, result };
      } catch (error) {
        provider.failures += 1;
        lastError = error;
        if (provider.failures >= this.failureThreshold) provider.openedAt = this.clock();
        continue;
      }
    }
    if (lastError) throw lastError;
    throw new Error(`No healthy MCP provider for capability: ${capability}`);
  }
}
