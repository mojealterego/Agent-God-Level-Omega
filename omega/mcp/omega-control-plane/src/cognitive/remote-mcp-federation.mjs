import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

function validateEndpoint(endpoint) {
  const url = new URL(endpoint);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('Remote MCP endpoints must use HTTPS; HTTP is allowed only for localhost');
  }
  return url;
}

function rejectSecretStaticHeaders(headers = {}) {
  for (const [name, value] of Object.entries(headers)) {
    if (/(authorization|token|api[-_]?key|secret|credential)/i.test(name) && value) {
      throw new Error(`Secret-bearing header ${name} must be supplied through headerEnv or auth, not persisted directly`);
    }
  }
}

function validateAuth(auth) {
  if (!auth) return null;
  if (!['bearer-env', 'client-credentials-env'].includes(auth.type)) {
    throw new Error(`Unsupported MCP auth type: ${auth.type}`);
  }
  if (auth.type === 'bearer-env' && !auth.env) throw new TypeError('bearer-env auth requires env');
  if (auth.type === 'client-credentials-env' && (!auth.clientIdEnv || !auth.clientSecretEnv)) {
    throw new TypeError('client-credentials-env auth requires clientIdEnv and clientSecretEnv');
  }
  return { ...auth };
}

async function atomicWriteJson(path, value) {
  if (!path) return;
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await rename(tmp, path);
}

async function readJson(path, fallback) {
  if (!path) return fallback;
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error?.code === 'ENOENT') return fallback; throw error; }
}

async function defaultClientFactory({ endpoint, headers, auth }) {
  const mod = await import('@modelcontextprotocol/client');
  let authProvider;
  if (auth?.type === 'bearer') {
    authProvider = { token: async () => auth.token };
  } else if (auth?.type === 'client-credentials') {
    authProvider = new mod.ClientCredentialsProvider({
      clientId: auth.clientId,
      clientSecret: auth.clientSecret,
      ...(auth.expectedIssuer ? { expectedIssuer: auth.expectedIssuer } : {})
    });
  }

  const client = new mod.Client(
    { name: 'omega-mcp-federation', version: '6.0.0' },
    { versionNegotiation: { mode: 'auto' } }
  );
  const transport = new mod.StreamableHTTPClientTransport(new URL(endpoint), {
    requestInit: { headers },
    ...(authProvider ? { authProvider } : {})
  });
  await client.connect(transport);
  return {
    listTools: async () => await client.listTools(),
    callTool: async (input) => await client.callTool(input),
    close: async () => {
      try { await transport.terminateSession?.(); } finally { await client.close(); }
    },
    protocolEra: () => client.getProtocolEra?.(),
    serverVersion: () => client.getServerVersion?.()
  };
}

export class RemoteMcpFederation {
  constructor({ clientFactory = defaultClientFactory, filePath = null, env = process.env, failureThreshold = 3, cooldownMs = 30000 } = {}) {
    this.clientFactory = clientFactory;
    this.filePath = filePath;
    this.env = env;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.providers = new Map();
    this.clients = new Map();
    this.loaded = false;
  }

  async load() {
    if (this.loaded) return;
    const state = await readJson(this.filePath, { providers: [] });
    for (const cfg of state.providers ?? []) this.#register(cfg);
    this.loaded = true;
  }

  #serialize() {
    return {
      providers: [...this.providers.values()].map((p) => ({
        id: p.id,
        endpoint: p.endpoint,
        priority: p.priority,
        capabilities: [...p.capabilities],
        headers: { ...p.headers },
        headerEnv: { ...p.headerEnv },
        auth: p.auth ? { ...p.auth } : null,
        metadata: { ...p.metadata },
        health: {
          failures: p.failures,
          lastError: p.lastError,
          circuitOpenedAt: p.circuitOpenedAt,
          lastHealthyAt: p.lastHealthyAt,
          lastLatencyMs: p.lastLatencyMs
        }
      }))
    };
  }

  async exportConfig() {
    await this.load();
    return this.#serialize();
  }

  async #save() { await atomicWriteJson(this.filePath, this.#serialize()); }

  #register({ id, endpoint, priority = 0, capabilities = [], headers = {}, headerEnv = {}, auth = null, metadata = {}, health = {} }) {
    if (!id) throw new TypeError('id is required');
    validateEndpoint(endpoint);
    rejectSecretStaticHeaders(headers);
    const normalizedAuth = validateAuth(auth);
    this.providers.set(id, {
      id,
      endpoint,
      priority: Number(priority),
      capabilities: [...new Set(capabilities)],
      headers: { ...headers },
      headerEnv: { ...headerEnv },
      auth: normalizedAuth,
      metadata: { ...metadata },
      failures: Number(health.failures ?? 0),
      lastError: health.lastError ?? null,
      circuitOpenedAt: health.circuitOpenedAt ?? null,
      lastHealthyAt: health.lastHealthyAt ?? null,
      lastLatencyMs: health.lastLatencyMs ?? null
    });
    return id;
  }

  async register(config) {
    await this.load();
    const current = this.clients.get(config.id);
    if (current) await current.close().catch(() => {});
    this.clients.delete(config.id);
    const id = this.#register(config);
    await this.#save();
    return id;
  }

  async unregister(id) {
    await this.load();
    const client = this.clients.get(id);
    if (client) await client.close().catch(() => {});
    this.clients.delete(id);
    const deleted = this.providers.delete(id);
    await this.#save();
    return deleted;
  }

  #resolvedHeaders(provider) {
    const headers = { ...provider.headers };
    for (const [header, envName] of Object.entries(provider.headerEnv ?? {})) {
      const value = this.env[envName];
      if (!value) throw new Error(`Missing environment variable for MCP header ${header}: ${envName}`);
      headers[header] = value;
    }
    return headers;
  }

  #resolvedAuth(provider) {
    if (!provider.auth) return null;
    if (provider.auth.type === 'bearer-env') {
      const token = this.env[provider.auth.env];
      if (!token) throw new Error(`Missing environment variable for MCP bearer auth: ${provider.auth.env}`);
      return { type: 'bearer', token };
    }
    if (provider.auth.type === 'client-credentials-env') {
      const clientId = this.env[provider.auth.clientIdEnv];
      const clientSecret = this.env[provider.auth.clientSecretEnv];
      if (!clientId) throw new Error(`Missing MCP OAuth client id env: ${provider.auth.clientIdEnv}`);
      if (!clientSecret) throw new Error(`Missing MCP OAuth client secret env: ${provider.auth.clientSecretEnv}`);
      return {
        type: 'client-credentials',
        clientId,
        clientSecret,
        expectedIssuer: provider.auth.expectedIssuer ?? null
      };
    }
    throw new Error(`Unsupported MCP auth type: ${provider.auth.type}`);
  }

  #circuitOpen(provider) {
    if (!provider.circuitOpenedAt) return false;
    if ((Date.now() - provider.circuitOpenedAt) >= this.cooldownMs) {
      provider.circuitOpenedAt = null;
      provider.failures = 0;
      return false;
    }
    return true;
  }

  async #client(id) {
    await this.load();
    if (this.clients.has(id)) return this.clients.get(id);
    const provider = this.providers.get(id);
    if (!provider) throw new Error(`Unknown MCP provider: ${id}`);
    if (this.#circuitOpen(provider)) throw new Error(`MCP provider circuit is open: ${id}`);
    const client = await this.clientFactory({
      id,
      endpoint: provider.endpoint,
      headers: this.#resolvedHeaders(provider),
      auth: this.#resolvedAuth(provider),
      metadata: provider.metadata
    });
    this.clients.set(id, client);
    return client;
  }

  async listProviders() {
    await this.load();
    return [...this.providers.values()]
      .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
      .map((p) => ({
        id: p.id,
        endpoint: p.endpoint,
        priority: p.priority,
        capabilities: [...p.capabilities],
        authType: p.auth?.type ?? null,
        metadata: { ...p.metadata },
        connected: this.clients.has(p.id),
        failures: p.failures,
        lastError: p.lastError,
        circuitOpen: this.#circuitOpen(p),
        lastHealthyAt: p.lastHealthyAt,
        lastLatencyMs: p.lastLatencyMs
      }));
  }

  async listTools(providerId) {
    const client = await this.#client(providerId);
    const result = await client.listTools();
    return result?.tools ?? result ?? [];
  }

  async health(providerId) {
    await this.load();
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Unknown MCP provider: ${providerId}`);
    const started = Date.now();
    try {
      const client = await this.#client(providerId);
      const result = await client.listTools();
      const tools = result?.tools ?? result ?? [];
      const latencyMs = Date.now() - started;
      provider.failures = 0;
      provider.lastError = null;
      provider.circuitOpenedAt = null;
      provider.lastHealthyAt = new Date().toISOString();
      provider.lastLatencyMs = latencyMs;
      await this.#save();
      return {
        ok: true,
        providerId,
        latencyMs,
        toolCount: Array.isArray(tools) ? tools.length : 0,
        protocolEra: client.protocolEra?.() ?? null,
        serverVersion: client.serverVersion?.() ?? null
      };
    } catch (error) {
      provider.failures += 1;
      provider.lastError = error?.message ?? String(error);
      provider.lastLatencyMs = Date.now() - started;
      if (provider.failures >= this.failureThreshold) provider.circuitOpenedAt = Date.now();
      const client = this.clients.get(providerId);
      if (client) await client.close().catch(() => {});
      this.clients.delete(providerId);
      await this.#save();
      return { ok: false, providerId, latencyMs: provider.lastLatencyMs, error: provider.lastError, circuitOpen: this.#circuitOpen(provider) };
    }
  }

  async callTool({ providerId, name, arguments: args = {} }) {
    await this.load();
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Unknown MCP provider: ${providerId}`);
    if (this.#circuitOpen(provider)) throw new Error(`MCP provider circuit is open: ${providerId}`);
    const started = Date.now();
    try {
      const client = await this.#client(providerId);
      const result = await client.callTool({ name, arguments: args });
      provider.failures = 0;
      provider.lastError = null;
      provider.circuitOpenedAt = null;
      provider.lastHealthyAt = new Date().toISOString();
      provider.lastLatencyMs = Date.now() - started;
      await this.#save();
      return { providerId, result };
    } catch (error) {
      provider.failures += 1;
      provider.lastError = error?.message ?? String(error);
      provider.lastLatencyMs = Date.now() - started;
      if (provider.failures >= this.failureThreshold) provider.circuitOpenedAt = Date.now();
      const client = this.clients.get(providerId);
      if (client) await client.close().catch(() => {});
      this.clients.delete(providerId);
      await this.#save();
      throw error;
    }
  }

  async invoke({ capability, name, arguments: args = {}, providerId = null }) {
    await this.load();
    const candidates = [...this.providers.values()]
      .filter((p) => !providerId || p.id === providerId)
      .filter((p) => !capability || p.capabilities.includes(capability))
      .filter((p) => !this.#circuitOpen(p))
      .sort((a, b) => b.priority - a.priority || a.failures - b.failures || (a.lastLatencyMs ?? Infinity) - (b.lastLatencyMs ?? Infinity) || a.id.localeCompare(b.id));
    let last = null;
    for (const provider of candidates) {
      try { return await this.callTool({ providerId: provider.id, name, arguments: args }); }
      catch (error) { last = error; }
    }
    if (last) throw last;
    throw new Error(`No remote MCP provider matches capability: ${capability ?? '(any)'}`);
  }

  async close() {
    await Promise.all([...this.clients.values()].map((client) => client.close().catch(() => {})));
    this.clients.clear();
  }
}
