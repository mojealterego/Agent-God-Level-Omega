import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function tempRoot() { return await mkdtemp(join(tmpdir(), 'omega-v8-')); }

function rpc(script, operation, payload = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('python', [script], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0 && !out.trim()) return reject(new Error(err || `exit ${code}`));
      const line = out.trim().split(/\r?\n/).filter(Boolean).at(-1);
      try { resolve(JSON.parse(line)); } catch (e) { reject(new Error(`bad rpc output: ${out}\n${err}`)); }
    });
    child.stdin.end(JSON.stringify({ id: 't', operation, payload }) + '\n');
  });
}

test('JEPA auto runtime falls back to a real local torch reference backend when official V-JEPA dependencies are unavailable', async () => {
  const script = new URL('../runtime/jepa_auto_provider.py', import.meta.url).pathname;
  const health = await rpc(script, 'health');
  assert.equal(health.ok, true);
  assert.equal(health.result.ready, true);
  assert.equal(typeof health.result.backend, 'string');
  const smoke = await rpc(script, 'jepa.smoke', { frames: 8, dim: 16 });
  assert.equal(smoke.ok, true);
  assert.equal(smoke.result.verified, true);
  assert.equal(smoke.result.provenance.research_equivalent, false);
});

test('Titans auto runtime provides real test-time fast-weight memory without titans_pytorch', async () => {
  const script = new URL('../runtime/titans_auto_provider.py', import.meta.url).pathname;
  const health = await rpc(script, 'health');
  assert.equal(health.ok, true);
  assert.equal(health.result.ready, true);
  const smoke = await rpc(script, 'titans.smoke', { dim: 8, sequence_length: 16 });
  assert.equal(smoke.ok, true);
  assert.equal(smoke.result.verified, true);
  assert.equal(smoke.result.provenance.official, false);
});

test('R3Mem runtime has an exact reversible local fallback without claiming the trained R3Mem architecture', async () => {
  const script = new URL('../runtime/r3mem_provider.py', import.meta.url).pathname;
  const health = await rpc(script, 'health');
  assert.equal(health.ok, true);
  assert.equal(health.result.ready, true);
  assert.equal(health.result.provenance.research_equivalent, false);
  const smoke = await rpc(script, 'r3mem.smoke', { text: 'omega reversible memory Ω' });
  assert.equal(smoke.ok, true);
  assert.equal(smoke.result.verified, true);
});

test('final live activation reaches ACTIVE without Imandra key when formal verification is optional', async () => {
  const root = await tempRoot();
  const plane = new OmegaControlPlane({ workspaceRoots: [root], env: {} });
  const result = await plane.liveActivation({ cwd: root, action: 'activate', python: 'python', benchmark: false, includeImandra: true, requireImandra: false });
  assert.equal(result.state, 'ACTIVE');
  assert.equal(result.completed, true);
  assert.equal(result.imandra.status, 'OPTIONAL_UNAVAILABLE');
  for (const name of ['jepa', 'titans', 'r3mem']) assert.equal(result.providers[name].status, 'ACTIVE');
  await plane.close();
});

test('strict mode still refuses full completion without Imandra', async () => {
  const root = await tempRoot();
  const plane = new OmegaControlPlane({ workspaceRoots: [root], env: {} });
  const result = await plane.liveActivation({ cwd: root, action: 'activate', python: 'python', benchmark: false, includeImandra: true, requireImandra: true });
  assert.equal(result.completed, false);
  assert.notEqual(result.state, 'ACTIVE');
  assert.equal(result.imandra.status, 'BLOCKED');
  await plane.close();
});
