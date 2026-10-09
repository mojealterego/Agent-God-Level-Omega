import { createServer as createHttpServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';

const PLUGIN_TOKEN = process.env.OMEGA_RELAY_PLUGIN_TOKEN ?? '';
const AGENT_TOKEN = process.env.OMEGA_RELAY_AGENT_TOKEN ?? '';
const BOOTSTRAP_TOKEN = process.env.OMEGA_RELAY_BOOTSTRAP_TOKEN ?? '';
const PAIR_CODE = process.env.OMEGA_PAIR_CODE ?? '';
const READ_BRIDGE_TOKEN = process.env.OMEGA_READ_BRIDGE_TOKEN ?? '';
const SOURCE_REF = process.env.OMEGA_SOURCE_REF ?? 'main';
const PORT = Number(process.env.PORT || 10000);
const RPC_TIMEOUT_MS = Number(process.env.OMEGA_RELAY_RPC_TIMEOUT_MS || 180000);

if (!PLUGIN_TOKEN || !AGENT_TOKEN || !BOOTSTRAP_TOKEN || !PAIR_CODE) {
  throw new Error('OMEGA relay secrets are not configured');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left ?? ''));
  const b = Buffer.from(String(right ?? ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearer(req) {
  const value = String(req.headers.authorization ?? '');
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1] ?? '';
}

function json(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

async function readJsonBody(req, maxBytes = 4096) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('request_too_large');
      error.code = 'REQUEST_TOO_LARGE';
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const pairAttempts = new Map();

function allowPairAttempt(address) {
  const key = String(address || 'unknown');
  const now = Date.now();
  const current = pairAttempts.get(key);
  if (!current || now >= current.resetAt) {
    pairAttempts.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

let agentSocket = null;
let agentAuthenticated = false;
const pending = new Map();

function rejectPending(reason) {
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer);
    entry.reject(new Error(reason));
    pending.delete(id);
  }
}

function phoneRpc(method, params = {}) {
  if (!agentSocket || agentSocket.readyState !== 1 || !agentAuthenticated) {
    return Promise.reject(new Error('OMEGA phone agent is offline'));
  }
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('OMEGA phone agent request timed out'));
    }, RPC_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    agentSocket.send(JSON.stringify({ type: 'request', id, method, params }));
  });
}

function mcpSuccess(value) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: { result: value }
  };
}

function readOnlyTool(description, inputSchema, handler) {
  return {
    config: {
      description,
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    handler: async (input) => mcpSuccess(await handler(input))
  };
}

function buildMcpServer() {
  const server = new McpServer({
    name: 'omega-termux-knowledge-connector',
    version: '0.1.0'
  });

  const tools = {
    omega_knowledge_info: readOnlyTool(
      'Report the live Android/Termux knowledge-folder status without exposing private absolute paths.',
      z.object({}),
      () => phoneRpc('knowledge.info', {})
    ),
    omega_knowledge_list: readOnlyTool(
      'List files and folders under the bound Android knowledge root.',
      z.object({
        path: z.string().default(''),
        recursive: z.boolean().default(false),
        maxEntries: z.number().int().min(1).max(20000).default(1000)
      }),
      (input) => phoneRpc('knowledge.list', input)
    ),
    omega_knowledge_metadata: readOnlyTool(
      'Return read-only metadata for one path under the Android knowledge root.',
      z.object({ path: z.string().min(1) }),
      (input) => phoneRpc('knowledge.metadata', input)
    ),
    omega_knowledge_read: readOnlyTool(
      'Extract bounded text from a supported file under the Android knowledge root.',
      z.object({
        path: z.string().min(1),
        maxBytes: z.number().int().min(1).max(4194304).default(1048576)
      }),
      (input) => phoneRpc('knowledge.read', input)
    ),
    omega_knowledge_search: readOnlyTool(
      'Search supported documents under the Android knowledge root.',
      z.object({
        query: z.string().min(1).max(512),
        path: z.string().default(''),
        recursive: z.boolean().default(true),
        maxFiles: z.number().int().min(1).max(2000).default(250),
        maxMatches: z.number().int().min(1).max(500).default(100),
        maxBytesPerFile: z.number().int().min(1024).max(1048576).default(262144)
      }),
      (input) => phoneRpc('knowledge.search', input)
    )
  };

  for (const [name, tool] of Object.entries(tools)) {
    server.registerTool(name, tool.config, tool.handler);
  }
  return server;
}

const mcpHandler = createMcpHandler(() => buildMcpServer(), { responseMode: 'json' });
const nodeMcp = toNodeHandler(mcpHandler);

const webSocketServer = new WebSocketServer({ noServer: true });

webSocketServer.on('connection', (socket) => {
  let authenticated = false;
  const authTimer = setTimeout(() => {
    if (!authenticated) socket.close(4401, 'authentication required');
  }, 10000);

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      socket.close(4400, 'invalid json');
      return;
    }

    if (!authenticated) {
      if (message?.type !== 'auth' || !safeEqual(message?.token, AGENT_TOKEN)) {
        socket.close(4403, 'authentication failed');
        return;
      }
      clearTimeout(authTimer);
      authenticated = true;
      if (agentSocket && agentSocket !== socket && agentSocket.readyState === 1) {
        agentSocket.close(4000, 'replaced by newer phone session');
      }
      agentSocket = socket;
      agentAuthenticated = true;
      socket.send(JSON.stringify({ type: 'auth_ok', connector: 'omega-termux-knowledge' }));
      return;
    }

    if (message?.type === 'response' && typeof message?.id === 'string') {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      clearTimeout(entry.timer);
      if (message.ok) entry.resolve(message.result);
      else entry.reject(new Error(message?.error?.message || 'Phone agent request failed'));
      return;
    }

    if (message?.type === 'ping') {
      socket.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
    }
  });

  socket.on('close', () => {
    clearTimeout(authTimer);
    if (agentSocket === socket) {
      agentSocket = null;
      agentAuthenticated = false;
      rejectPending('OMEGA phone agent disconnected');
    }
  });

  socket.on('error', () => {
    if (agentSocket === socket) {
      agentSocket = null;
      agentAuthenticated = false;
      rejectPending('OMEGA phone agent connection failed');
    }
  });
});

function bootstrapScript(origin) {
  const rawBase = `https://raw.githubusercontent.com/mojealterego/Agent-God-Level-Omega/${SOURCE_REF}`;
  return `#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
pkg update -y
pkg install -y nodejs-lts curl unzip poppler coreutils
termux-setup-storage >/dev/null 2>&1 || true
mkdir -p "$HOME/.config/omega" "$HOME/.local/share/omega-knowledge-relay"
chmod 700 "$HOME/.config/omega" "$HOME/.local/share/omega-knowledge-relay"
curl -fsSL "${rawBase}/services/omega-termux-knowledge-relay/phone-client.mjs" -o "$HOME/.local/share/omega-knowledge-relay/phone-client.mjs"
curl -fsSL "${rawBase}/omega-mobile/mcp/omega-control-plane/src/knowledge/phone-knowledge-root.mjs" -o "$HOME/.local/share/omega-knowledge-relay/phone-knowledge-root.mjs"
cat > "$HOME/.config/omega/relay_url" <<'OMEGA_RELAY_URL'
${origin}
OMEGA_RELAY_URL
cat > "$HOME/.config/omega/relay_agent_token" <<'OMEGA_RELAY_TOKEN'
${AGENT_TOKEN}
OMEGA_RELAY_TOKEN
chmod 600 "$HOME/.config/omega/relay_url" "$HOME/.config/omega/relay_agent_token"
for candidate in "$HOME/storage/downloads/BAZA WIEDZY" "/storage/emulated/0/Download/BAZA WIEDZY"; do
  if [ -d "$candidate" ] && [ -r "$candidate" ]; then
    printf '%s\\n' "$(realpath "$candidate")" > "$HOME/.config/omega/knowledge_root"
    chmod 600 "$HOME/.config/omega/knowledge_root"
    break
  fi
done
nohup node "$HOME/.local/share/omega-knowledge-relay/phone-client.mjs" > "$HOME/.local/share/omega-knowledge-relay/client.log" 2>&1 &
printf 'OMEGA Termux Knowledge Connector installed.\\n'
printf 'Log: %s\\n' "$HOME/.local/share/omega-knowledge-relay/client.log"
`;
}


const bridgeJobs = new Map();

function bridgeSpecFromUrl(url) {
  const op = url.searchParams.get('op') || 'info';
  if (op === 'info') {
    return { op, method: 'knowledge.info', params: {} };
  }
  if (op === 'list') {
    return {
      op,
      method: 'knowledge.list',
      params: {
        path: url.searchParams.get('path') || '',
        recursive: url.searchParams.get('recursive') === 'true',
        maxEntries: Math.max(1, Math.min(20000, Number(url.searchParams.get('maxEntries') || 1000)))
      }
    };
  }
  if (op === 'metadata') {
    const path = url.searchParams.get('path') || '';
    if (!path) throw new Error('path_required');
    return { op, method: 'knowledge.metadata', params: { path } };
  }
  if (op === 'read') {
    const path = url.searchParams.get('path') || '';
    if (!path) throw new Error('path_required');
    return {
      op,
      method: 'knowledge.read',
      params: {
        path,
        maxBytes: Math.max(1, Math.min(4194304, Number(url.searchParams.get('maxBytes') || 1048576)))
      }
    };
  }
  if (op === 'search') {
    const query = url.searchParams.get('query') || '';
    if (!query) throw new Error('query_required');
    return {
      op,
      method: 'knowledge.search',
      params: {
        query,
        path: url.searchParams.get('path') || '',
        recursive: url.searchParams.get('recursive') !== 'false',
        maxFiles: Math.max(1, Math.min(2000, Number(url.searchParams.get('maxFiles') || 250))),
        maxMatches: Math.max(1, Math.min(500, Number(url.searchParams.get('maxMatches') || 100))),
        maxBytesPerFile: Math.max(1024, Math.min(1048576, Number(url.searchParams.get('maxBytesPerFile') || 262144)))
      }
    };
  }
  throw new Error('unsupported_op');
}

function startBridgeJob(url) {
  const spec = bridgeSpecFromUrl(url);
  const id = crypto.randomUUID();
  const job = {
    id,
    op: spec.op,
    status: 'pending',
    createdAt: Date.now()
  };
  bridgeJobs.set(id, job);

  phoneRpc(spec.method, spec.params)
    .then((result) => {
      job.status = 'done';
      job.result = result;
      job.finishedAt = Date.now();
    })
    .catch((error) => {
      job.status = 'error';
      job.error = error?.message || String(error);
      job.finishedAt = Date.now();
    });

  const timer = setTimeout(() => bridgeJobs.delete(id), 10 * 60_000);
  timer.unref?.();
  return job;
}

const httpServer = createHttpServer(async (req, res) => {
  const origin = `https://${req.headers.host || 'localhost'}`;
  const url = new URL(req.url || '/', origin);

  if (url.pathname === '/healthz') {
    return json(res, 200, {
      ok: true,
      service: 'omega-termux-knowledge-relay',
      phone_connected: Boolean(agentSocket && agentSocket.readyState === 1 && agentAuthenticated)
    });
  }

  if (url.pathname === '/readyz') {
    const connected = Boolean(agentSocket && agentSocket.readyState === 1 && agentAuthenticated);
    return json(res, connected ? 200 : 503, { ok: connected, phone_connected: connected });
  }

  if (url.pathname === '/pair' && req.method === 'POST') {
    if (!allowPairAttempt(req.socket.remoteAddress)) {
      return json(res, 429, { error: 'too_many_attempts' });
    }
    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return json(res, error?.code === 'REQUEST_TOO_LARGE' ? 413 : 400, { error: 'invalid_request' });
    }
    if (!safeEqual(body?.code, PAIR_CODE)) {
      return json(res, 403, { error: 'invalid_pair_code' });
    }
    const wsOrigin = origin.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
    return json(res, 200, {
      ok: true,
      websocket_url: `${wsOrigin}/agent`,
      agent_token: AGENT_TOKEN
    });
  }

  if (url.pathname === '/bridge/start' && req.method === 'GET') {
    if (!READ_BRIDGE_TOKEN || !safeEqual(url.searchParams.get('token'), READ_BRIDGE_TOKEN)) {
      return json(res, 404, { error: 'not_found' });
    }
    try {
      const job = startBridgeJob(url);
      return json(res, 202, { ok: true, job_id: job.id, op: job.op, status: job.status });
    } catch (error) {
      return json(res, 400, { ok: false, error: error?.message || String(error) });
    }
  }

  if (url.pathname === '/bridge/result' && req.method === 'GET') {
    if (!READ_BRIDGE_TOKEN || !safeEqual(url.searchParams.get('token'), READ_BRIDGE_TOKEN)) {
      return json(res, 404, { error: 'not_found' });
    }
    const id = url.searchParams.get('id') || '';
    const job = bridgeJobs.get(id);
    if (!job) return json(res, 404, { error: 'job_not_found' });
    if (job.status === 'pending') {
      return json(res, 202, { ok: true, job_id: id, op: job.op, status: 'pending' });
    }
    if (job.status === 'error') {
      return json(res, 503, { ok: false, job_id: id, op: job.op, status: 'error', error: job.error });
    }
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0));
    const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get('limit') || 1000)));
    if (job.result && Array.isArray(job.result.entries)) {
      const total = job.result.entries.length;
      const slice = job.result.entries.slice(offset, offset + limit);
      return json(res, 200, {
        ok: true,
        job_id: id,
        op: job.op,
        status: 'done',
        result: {
          ...job.result,
          entries: slice,
          page: { offset, limit, returned: slice.length, total }
        }
      });
    }
    if (job.result && Array.isArray(job.result.matches)) {
      const total = job.result.matches.length;
      const slice = job.result.matches.slice(offset, offset + limit);
      return json(res, 200, {
        ok: true,
        job_id: id,
        op: job.op,
        status: 'done',
        result: {
          ...job.result,
          matches: slice,
          page: { offset, limit, returned: slice.length, total }
        }
      });
    }
    return json(res, 200, { ok: true, job_id: id, op: job.op, status: 'done', result: job.result });
  }

  if (url.pathname === '/bridge' && req.method === 'GET') {
    if (!READ_BRIDGE_TOKEN || !safeEqual(url.searchParams.get('token'), READ_BRIDGE_TOKEN)) {
      return json(res, 404, { error: 'not_found' });
    }
    try {
      const spec = bridgeSpecFromUrl(url);
      const result = await phoneRpc(spec.method, spec.params);
      return json(res, 200, { ok: true, op: spec.op, result });
    } catch (error) {
      return json(res, 503, { ok: false, error: error?.message || String(error) });
    }
  }

  if (url.pathname === '/bootstrap' && req.method === 'GET') {
    if (!safeEqual(url.searchParams.get('code'), BOOTSTRAP_TOKEN)) {
      return json(res, 404, { error: 'not_found' });
    }
    const script = bootstrapScript(origin);
    res.writeHead(200, {
      'content-type': 'text/x-shellscript; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(script)
    });
    return res.end(script);
  }

  if (url.pathname === '/mcp') {
    if (!safeEqual(bearer(req), PLUGIN_TOKEN)) {
      return json(res, 401, { error: 'invalid_token' }, {
        'www-authenticate': 'Bearer realm="omega-termux-knowledge"'
      });
    }
    return nodeMcp(req, res);
  }

  return json(res, 404, { error: 'not_found' });
});

httpServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/agent') {
    socket.destroy();
    return;
  }
  webSocketServer.handleUpgrade(req, socket, head, (ws) => {
    webSocketServer.emit('connection', ws, req);
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`OMEGA Termux Knowledge Relay listening on 0.0.0.0:${PORT}`);
});
