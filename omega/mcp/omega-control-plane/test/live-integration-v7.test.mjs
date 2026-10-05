import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { builtinRuntimePreset } from '../src/cognitive/runtime-presets.mjs';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function tempRoot() { return await mkdtemp(join(tmpdir(), 'omega-live-int-v7-')); }

test('built-in runtime presets advertise real smoke operations used by live activation', () => {
  for (const [providerType, operation] of [['jepa', 'jepa.smoke'], ['titans', 'titans.smoke'], ['r3mem', 'r3mem.smoke']]) {
    const preset = builtinRuntimePreset(providerType, { packageRoot: process.cwd(), python: 'python' });
    assert.equal(preset.capabilities.includes(operation), true, `${providerType} missing ${operation}`);
  }
});

test('provider benchmark executes a live process provider repeatedly and returns admitted metrics', async () => {
  const root = await tempRoot();
  const fixture = join(root, 'provider.mjs');
  await writeFile(fixture, `
    import readline from 'node:readline';
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    for await (const line of rl) {
      const req = JSON.parse(line);
      const result = req.operation === 'health' ? {ready:true} : {verified:true, n:req.payload?.n ?? 0};
      process.stdout.write(JSON.stringify({id:req.id, ok:true, result})+'\\n');
    }
  `);
  const plane = new OmegaControlPlane({ workspaceRoots: [root] });
  await plane.cognitiveProvider({ cwd: root, action: 'register', id: 'bench', providerType: 'generic', kind: 'process', command: process.execPath, args: [fixture], processCwd: root, capabilities: ['smoke'] });
  const result = await plane.benchmarkProvider({ cwd: root, providerId: 'bench', operation: 'smoke', payload: { n: 7 }, repetitions: 3, warmups: 1 });
  assert.equal(result.admitted, true);
  assert.equal(result.metrics.samples, 3);
  assert.equal(result.samples.every((s) => s.exitCode === 0), true);
  await plane.close();
});

test('control plane live activation status is read-only and returns fail-closed provider readiness', async () => {
  const root = await tempRoot();
  const plane = new OmegaControlPlane({ workspaceRoots: [root], env: {} });
  const status = await plane.liveActivation({ cwd: root, action: 'status', python: 'python' });
  assert.equal(status.imandra.apiKeyConfigured, false);
  assert.deepEqual(Object.keys(status.providers).sort(), ['jepa', 'r3mem', 'titans']);
  assert.equal(JSON.stringify(status).includes('IMANDRA_API_KEY='), false);
  await plane.close();
});
