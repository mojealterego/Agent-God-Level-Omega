import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import https from 'node:https';

export const OMEGA_EVENT_DEFINITIONS = Object.freeze([
  {
    name: 'omega.run.completed',
    description: 'An OMEGA engineering run reached a terminal completed state.',
    delivery: ['webhook'],
    inputSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string' },
        project: { type: 'string' }
      },
      additionalProperties: false
    },
    payloadSchema: {
      type: 'object',
      properties: {
        repository: { type: 'string' },
        project: { type: 'string' },
        runId: { type: 'string' },
        status: { type: 'string' },
        url: { type: 'string' }
      },
      required: ['runId', 'status'],
      additionalProperties: true
    }
  },
  {
    name: 'omega.artifact.created',
    description: 'OMEGA created a new package, report, media item or other tracked artifact.',
    delivery: ['webhook'],
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'string' }, repository: { type: 'string' } },
      additionalProperties: false
    },
    payloadSchema: {
      type: 'object',
      properties: {
        project: { type: 'string' }, repository: { type: 'string' }, artifactId: { type: 'string' }, url: { type: 'string' }
      },
      required: ['artifactId'],
      additionalProperties: true
    }
  },
  {
    name: 'omega.validation.changed',
    description: 'A validation, assurance or WDA quality gate changed state.',
    delivery: ['webhook'],
    inputSchema: {
      type: 'object',
      properties: { domain: { type: 'string' }, project: { type: 'string' } },
      additionalProperties: false
    },
    payloadSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string' }, project: { type: 'string' }, previous: { type: 'string' }, current: { type: 'string' }, evidenceUrl: { type: 'string' }
      },
      required: ['domain', 'current'],
      additionalProperties: true
    }
  }
]);

export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

export function deterministicSubscriptionId({ subject, url, name, arguments: args = {} }) {
  const material = canonicalJson({ subject: String(subject), url: String(url), name: String(name), arguments: args });
  return `sub_${createHash('sha256').update(material).digest('hex').slice(0, 48)}`;
}

export function validateSigningSecret(secret) {
  if (typeof secret !== 'string' || !secret.startsWith('whsec_')) throw new Error('Signing secret must start with whsec_');
  const raw = secret.slice(6);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error('Signing secret must contain base64 after whsec_');
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length < 24 || bytes.length > 64) throw new Error('Signing secret must decode to 24-64 bytes');
  return secret;
}

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => ((acc << 8) | Number(part)) >>> 0, 0);
}

function ipv4In(ip, base, bits) {
  const n = ipv4ToInt(ip); const b = ipv4ToInt(base); const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (n & mask) === (b & mask);
}

export function isPublicIp(address) {
  const kind = isIP(address);
  if (kind === 4) {
    const blocked = [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
      ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
      ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
    ];
    return !blocked.some(([base, bits]) => ipv4In(address, base, bits));
  }
  if (kind === 6) {
    const x = address.toLowerCase();
    if (x === '::' || x === '::1') return false;
    if (x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb')) return false;
    if (x.startsWith('2001:db8:')) return false;
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    return true;
  }
  return false;
}

async function defaultResolveHost(hostname) {
  const rows = await dnsLookup(hostname, { all: true, verbatim: true });
  return rows.map(row => row.address);
}

export async function validatePublicCallbackUrl(rawUrl, { resolveHost = defaultResolveHost } = {}) {
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('Callback URL is invalid'); }
  if (url.protocol !== 'https:') throw new Error('Callback URL must use HTTPS');
  if (url.username || url.password) throw new Error('Callback URL credentials are not allowed');
  if (url.port && url.port !== '443') throw new Error('Callback URL must use HTTPS port 443');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost')) throw new Error('Callback URL must resolve to a public address');
  const answers = isIP(host) ? [host] : await resolveHost(host);
  if (!Array.isArray(answers) || answers.length === 0 || answers.some(address => !isPublicIp(address))) {
    throw new Error('Callback URL must resolve only to public addresses');
  }
  return { url, hostname: host, addresses: answers };
}

function standardWebhookSignature(secret, id, timestampSeconds, body) {
  validateSigningSecret(secret);
  const key = Buffer.from(secret.slice(6), 'base64');
  const message = `${id}.${timestampSeconds}.${body}`;
  const digest = createHmac('sha256', key).update(message).digest('base64');
  return `v1,${digest}`;
}

function constantTimeTextEqual(a, b) {
  const x = Buffer.from(String(a)); const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

async function secureHttpsRequest(urlString, init, validated) {
  const url = new URL(urlString);
  const address = validated?.addresses?.[0];
  return await new Promise((resolve, reject) => {
    const req = https.request({
      protocol: 'https:',
      hostname: url.hostname,
      port: 443,
      path: `${url.pathname}${url.search}`,
      method: init.method ?? 'POST',
      headers: init.headers,
      servername: url.hostname,
      lookup: address ? (_hostname, _opts, cb) => cb(null, address, isIP(address)) : undefined,
      timeout: 10_000
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(new Response(text, { status: res.statusCode ?? 500, headers: res.headers }));
      });
    });
    req.on('timeout', () => req.destroy(new Error('callback timeout')));
    req.on('error', reject);
    if (init.body != null) req.write(init.body);
    req.end();
  });
}

export class InMemorySubscriptionStore {
  constructor() { this.map = new Map(); }
  async get(id) { return this.map.get(id) ?? null; }
  async put(record) { this.map.set(record.id, structuredClone(record)); return record; }
  async delete(id) { this.map.delete(id); }
  async list() { return [...this.map.values()].map(value => structuredClone(value)); }
}

function eventDefinition(name) {
  return OMEGA_EVENT_DEFINITIONS.find(event => event.name === name) ?? null;
}

function matchesFilter(filter, data) {
  return Object.entries(filter ?? {}).every(([key, value]) => data?.[key] === value);
}

export class OpenAIMcpEventService {
  constructor({ store, resolveHost = defaultResolveHost, fetchImpl = null, now = () => new Date(), randomId = null, defaultTtlMs = 24 * 60 * 60 * 1000 } = {}) {
    this.store = store ?? new InMemorySubscriptionStore();
    this.resolveHost = resolveHost;
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.randomId = randomId ?? (() => randomBytes(18).toString('base64url'));
    this.defaultTtlMs = defaultTtlMs;
    this.verified = new Map();
  }

  list() { return { events: structuredClone(OMEGA_EVENT_DEFINITIONS), nextCursor: null }; }

  async #request(url, init, validated) {
    if (this.fetchImpl) return await this.fetchImpl(url, init);
    return await secureHttpsRequest(url, init, validated);
  }

  async #verifyCallback({ subject, url, secret }) {
    const cacheKey = `${subject}\n${url}`;
    const cachedUntil = this.verified.get(cacheKey) ?? 0;
    if (cachedUntil > this.now().getTime()) return;
    const validated = await validatePublicCallbackUrl(url, { resolveHost: this.resolveHost });
    const challenge = this.randomId();
    const id = `msg_verification_${createHash('sha256').update(`${subject}\n${url}\n${challenge}`).digest('hex').slice(0, 24)}`;
    const body = JSON.stringify({ type: 'verification', challenge });
    const timestamp = Math.floor(this.now().getTime() / 1000);
    const response = await this.#request(url, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: {
        'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': String(timestamp),
        'webhook-signature': standardWebhookSignature(secret, id, timestamp, body),
        'X-MCP-Subscription-Id': 'pending'
      }, body
    }, validated);
    if (!response.ok) throw new Error(`CallbackEndpointError: callback verification returned ${response.status}`);
    let decoded;
    try { decoded = await response.json(); } catch { throw new Error('CallbackEndpointError: challenge_failed'); }
    if (!constantTimeTextEqual(decoded?.challenge ?? '', challenge)) throw new Error('CallbackEndpointError: challenge_failed');
    this.verified.set(cacheKey, this.now().getTime() + 10 * 60 * 1000);
  }

  async subscribe({ subject, name, arguments: args = {}, delivery, cursor = null, ttlMs } = {}) {
    if (!eventDefinition(name)) throw new Error(`Unknown event: ${name}`);
    if (!subject) throw new Error('Authenticated subject is required');
    if (delivery?.mode !== 'webhook') throw new Error('Only webhook delivery is supported');
    validateSigningSecret(delivery.secret);
    const validated = await validatePublicCallbackUrl(delivery.url, { resolveHost: this.resolveHost });
    const id = deterministicSubscriptionId({ subject, url: delivery.url, name, arguments: args });
    const existing = await this.store.get(id);
    if (!existing) await this.#verifyCallback({ subject, url: delivery.url, secret: delivery.secret });
    const requested = ttlMs === null ? null : Number.isFinite(ttlMs) ? Math.max(60_000, Math.floor(ttlMs)) : this.defaultTtlMs;
    const refreshBefore = requested === null ? null : new Date(this.now().getTime() + requested).toISOString();
    const record = {
      id, subject, name, arguments: structuredClone(args), delivery: { mode: 'webhook', url: delivery.url, secret: delivery.secret },
      cursor: cursor ?? null, refreshBefore, active: true, verifiedAddresses: validated.addresses, updatedAt: this.now().toISOString()
    };
    await this.store.put(record);
    return { id, refreshBefore, cursor: record.cursor, truncated: false };
  }

  async unsubscribe({ subject, name, arguments: args = {}, delivery } = {}) {
    if (!subject || !name || delivery?.mode !== 'webhook' || !delivery?.url) return {};
    const id = deterministicSubscriptionId({ subject, url: delivery.url, name, arguments: args });
    await this.store.delete(id);
    return {};
  }

  async emit({ name, data, eventId = null, timestamp = null, cursor = null } = {}) {
    if (!eventDefinition(name)) throw new Error(`Unknown event: ${name}`);
    const now = this.now();
    const id = eventId ?? this.randomId();
    const envelope = { eventId: id, name, timestamp: timestamp ?? now.toISOString(), data: structuredClone(data ?? {}), cursor };
    const body = JSON.stringify(envelope);
    if (Buffer.byteLength(body, 'utf8') > 256 * 1024) throw new Error('Event payload exceeds 256 KiB');
    let delivered = 0, failed = 0, skipped = 0;
    for (const sub of await this.store.list()) {
      if (!sub.active || sub.name !== name || !matchesFilter(sub.arguments, data)) { skipped++; continue; }
      if (sub.refreshBefore && Date.parse(sub.refreshBefore) <= now.getTime()) { skipped++; continue; }
      try {
        const validated = await validatePublicCallbackUrl(sub.delivery.url, { resolveHost: this.resolveHost });
        let response = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          const signedAt = Math.floor(this.now().getTime() / 1000);
          response = await this.#request(sub.delivery.url, {
            method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
            headers: {
              'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': String(signedAt),
              'webhook-signature': standardWebhookSignature(sub.delivery.secret, id, signedAt, body),
              'X-MCP-Subscription-Id': sub.id
            }, body
          }, validated);
          if (response.ok || response.status === 410 || response.status === 413 || response.status < 500) break;
          await new Promise(resolve => setTimeout(resolve, Math.min(1000 * (2 ** attempt), 4000)));
        }
        if (response?.ok) delivered++; else failed++;
      } catch { failed++; }
    }
    return { eventId: id, delivered, failed, skipped };
  }
}
