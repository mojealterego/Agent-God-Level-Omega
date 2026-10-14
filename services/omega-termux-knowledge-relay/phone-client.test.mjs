import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, copyFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

test('unconfigured knowledge folder does not prevent Termux relay agent starting', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omega-relay-client-'));
  const source = resolve(import.meta.dirname, 'phone-client.mjs');
  const knowledge = resolve(import.meta.dirname, '../../omega-mobile/mcp/omega-control-plane/src/knowledge/phone-knowledge-root.mjs');
  const clientFile = join(root, 'phone-client.mjs');
  await copyFile(source, clientFile);
  await copyFile(knowledge, join(root, 'phone-knowledge-root.mjs'));
  await mkdir(join(root, '.config', 'omega'), { recursive: true });
  const env = {
    ...process.env,
    HOME: root,
    XDG_CONFIG_HOME: join(root, '.config'),
    OMEGA_KNOWLEDGE_ROOT: '',
    OMEGA_RELAY_URL: 'https://127.0.0.1:9',
    OMEGA_RELAY_AGENT_TOKEN: 'test-agent-token',
  };
  // Use a deterministic offline WebSocket transport. A real localhost connection
  // can close immediately and does not exercise the knowledge-root fallback.
  const preloader = join(root, 'mock-websocket.mjs');
  await writeFile(preloader, `
    class MockWebSocket {
      static OPEN = 1;
      constructor() {
        this.readyState = MockWebSocket.OPEN;
        this.hold = setInterval(() => {}, 30000);
        setTimeout(() => this.onopen?.(), 1);
      }
      send() {}
      close() {
        clearInterval(this.hold);
        this.onclose?.();
      }
    }
    globalThis.WebSocket = MockWebSocket;
  `);
  const child = spawn(process.execPath, ['--import', preloader, clientFile], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let exited = false;
  let stderr = '';
  child.on('exit', () => { exited = true; });
  child.stderr.on('data', data => { stderr += String(data); });
  try {
    await sleep(750);
    assert.equal(exited, false, `agent exited instead of connecting without knowledge root: ${stderr}`);
  } finally {
    if (!exited) child.kill('SIGTERM');
    await sleep(50);
    await rm(root, { recursive: true, force: true });
  }
});
