function validateEndpoint(endpoint) {
  const url = new URL(endpoint);
  const local = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new Error('Cognitive provider endpoints must use HTTPS; HTTP is allowed only for localhost');
  }
  return url;
}

function validateHeaders(headers) {
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (/(authorization|token|api[-_]?key|secret|credential)/i.test(name) && value) {
      throw new Error(`Secret-bearing header ${name} must use headerEnv`);
    }
  }
}

async function httpTransport({ endpoint, headers, operation, payload, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('provider-timeout')), timeoutMs);
  timer.unref?.();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ operation, payload }),
      signal: controller.signal,
      redirect: 'error'
    });
    const text = await response.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = { text }; }
    if (!response.ok) throw new Error(`Provider HTTP ${response.status}: ${JSON.stringify(body)}`);
    return body;
  } finally { clearTimeout(timer); }
}

export class ExternalCognitiveProvider {
  constructor({ id, kind = 'http', endpoint, capabilities = [], headers = {}, headerEnv = {}, timeoutMs = 120000, transport = httpTransport, env = process.env, metadata = {} } = {}) {
    if (!id || !endpoint) throw new TypeError('id and endpoint are required');
    if (kind !== 'http') throw new Error(`Unsupported provider kind: ${kind}`);
    validateEndpoint(endpoint);
    validateHeaders(headers);
    this.id = id;
    this.kind = kind;
    this.endpoint = endpoint;
    this.capabilities = new Set(capabilities);
    this.headers = { ...headers };
    this.headerEnv = { ...headerEnv };
    this.timeoutMs = timeoutMs;
    this.transport = transport;
    this.env = env;
    this.metadata = { ...metadata };
  }

  resolvedHeaders() {
    const out = { ...this.headers };
    for (const [header, envName] of Object.entries(this.headerEnv)) {
      const value = this.env[envName];
      if (!value) throw new Error(`Missing environment variable for provider header ${header}: ${envName}`);
      out[header] = value;
    }
    return out;
  }

  async invoke(operation, payload = {}) {
    if (!this.capabilities.has(operation)) throw new Error(`Provider ${this.id} does not advertise capability ${operation}`);
    return await this.transport({ id: this.id, kind: this.kind, endpoint: this.endpoint, headers: this.resolvedHeaders(), operation, payload, timeoutMs: this.timeoutMs, metadata: this.metadata });
  }

  descriptor() {
    return { id: this.id, kind: this.kind, endpoint: this.endpoint, capabilities: [...this.capabilities], headers: this.headers, headerEnv: this.headerEnv, timeoutMs: this.timeoutMs, metadata: this.metadata };
  }
}
