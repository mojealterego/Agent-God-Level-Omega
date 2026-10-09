import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { PhoneKnowledgeRoot } from './phone-knowledge-root.mjs';

const HOME = homedir();
const CONFIG_DIR = process.env.XDG_CONFIG_HOME
  ? join(process.env.XDG_CONFIG_HOME, 'omega')
  : join(HOME, '.config', 'omega');

async function readConfig(name) {
  try {
    return (await readFile(join(CONFIG_DIR, name), 'utf8')).trim();
  } catch {
    return '';
  }
}

async function resolveRoot() {
  const configured = process.env.OMEGA_KNOWLEDGE_ROOT || await readConfig('knowledge_root');
  if (configured) return configured;
  const candidates = [
    join(HOME, 'storage', 'downloads', 'BAZA WIEDZY'),
    '/storage/emulated/0/Download/BAZA WIEDZY'
  ];
  for (const candidate of candidates) {
    try {
      const kb = new PhoneKnowledgeRoot({ root: candidate });
      await kb.info();
      return candidate;
    } catch {}
  }
  throw new Error('BAZA WIEDZY is not readable; grant Termux storage permission and run the connector again');
}

const relayUrl = process.env.OMEGA_RELAY_URL || await readConfig('relay_url');
const agentToken = process.env.OMEGA_RELAY_AGENT_TOKEN || await readConfig('relay_agent_token');

if (!relayUrl || !agentToken) {
  throw new Error('OMEGA relay URL/token is not configured');
}
if (typeof WebSocket !== 'function') {
  throw new Error('This connector requires Termux Node.js with the built-in WebSocket API');
}

const root = await resolveRoot();
const knowledge = new PhoneKnowledgeRoot({ root });
const socketUrl = relayUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:').replace(/\/$/, '') + '/agent';

async function dispatch(method, params = {}) {
  switch (method) {
    case 'knowledge.info': return knowledge.info();
    case 'knowledge.list': return knowledge.list(params);
    case 'knowledge.metadata': return knowledge.metadata(params);
    case 'knowledge.read': return knowledge.read(params);
    case 'knowledge.search': return knowledge.search(params);
    default: throw new Error(`Unsupported relay method: ${method}`);
  }
}

let retryMs = 2000;

function connect() {
  const ws = new WebSocket(socketUrl);
  let heartbeat = null;

  ws.onopen = () => {
    retryMs = 2000;
    ws.send(JSON.stringify({ type: 'auth', token: agentToken }));
    heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
      }
    }, 30000);
  };

  ws.onmessage = async (event) => {
    let message;
    try {
      message = JSON.parse(String(event.data));
    } catch {
      return;
    }
    if (message?.type !== 'request' || typeof message?.id !== 'string') return;

    try {
      const result = await dispatch(message.method, message.params ?? {});
      ws.send(JSON.stringify({ type: 'response', id: message.id, ok: true, result }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'response',
        id: message.id,
        ok: false,
        error: {
          name: error?.name ?? 'Error',
          code: error?.code ?? null,
          message: error?.message ?? String(error)
        }
      }));
    }
  };

  ws.onclose = () => {
    if (heartbeat) clearInterval(heartbeat);
    setTimeout(connect, retryMs);
    retryMs = Math.min(retryMs * 2, 30000);
  };

  ws.onerror = () => {
    try { ws.close(); } catch {}
  };
}

connect();
