import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ExternalCognitiveProvider } from './external-cognitive-provider.mjs';
import { LocalProcessCognitiveProvider } from './local-process-provider.mjs';

async function readJson(path, fallback) {
  if (!path) return fallback;
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error?.code === 'ENOENT') return fallback; throw error; }
}
async function atomic(path, value) {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await rename(tmp, path);
}

const DEFAULTS = {
  jepa: ['jepa.predict', 'jepa.embed'],
  titans: ['titans.memorize', 'titans.recall'],
  r3mem: ['r3mem.compress', 'r3mem.reconstruct'],
  generic: []
};

export class ExternalProviderRegistry {
  constructor({ filePath = null, transport, env = process.env } = {}) {
    this.filePath = filePath;
    this.transport = transport;
    this.env = env;
    this.providers = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    const state = await readJson(this.filePath, { providers: [] });
    for (const cfg of state.providers ?? []) this.#make(cfg);
    this.loaded = true;
  }

  #make(cfg) {
    if (!cfg?.id) throw new TypeError('provider id is required');
    const capabilities = cfg.capabilities?.length ? cfg.capabilities : (DEFAULTS[cfg.providerType] ?? []);
    let provider;
    if ((cfg.kind ?? 'http') === 'process') {
      provider = new LocalProcessCognitiveProvider({
        ...cfg,
        capabilities,
        hostEnv: this.env
      });
    } else {
      provider = new ExternalCognitiveProvider({
        ...cfg,
        capabilities,
        transport: this.transport,
        env: this.env
      });
    }
    this.providers.set(cfg.id, { providerType: cfg.providerType ?? 'generic', provider });
    return provider;
  }

  async #save() {
    await atomic(this.filePath, {
      providers: [...this.providers.values()].map(({ providerType, provider }) => ({ providerType, ...provider.descriptor() }))
    });
  }

  async register(cfg) {
    await this.load();
    const old = this.providers.get(cfg.id)?.provider;
    if (old?.close) await old.close().catch(() => {});
    const provider = this.#make(cfg);
    await this.#save();
    return provider.descriptor();
  }

  async unregister(id) {
    await this.load();
    const item = this.providers.get(id);
    if (item?.provider?.close) await item.provider.close().catch(() => {});
    const ok = this.providers.delete(id);
    await this.#save();
    return ok;
  }

  async list() {
    await this.load();
    return [...this.providers.values()].map(({ providerType, provider }) => ({ providerType, ...provider.descriptor() }));
  }

  async invoke(id, operation, payload) {
    await this.load();
    const item = this.providers.get(id);
    if (!item) throw new Error(`Unknown cognitive provider: ${id}`);
    return await item.provider.invoke(operation, payload);
  }

  async health(id) {
    await this.load();
    const item = this.providers.get(id);
    if (!item) throw new Error(`Unknown cognitive provider: ${id}`);
    if (typeof item.provider.health === 'function') return await item.provider.health();
    const started = Date.now();
    try {
      const result = await item.provider.invoke('health', {});
      return { ready: result?.ready !== false, providerId: id, latencyMs: Date.now() - started, ...result };
    } catch (error) {
      return { ready: false, providerId: id, latencyMs: Date.now() - started, error: error?.message ?? String(error) };
    }
  }

  async close() {
    await Promise.all([...this.providers.values()].map(async ({ provider }) => {
      if (typeof provider.close === 'function') await provider.close().catch(() => {});
    }));
  }
}
