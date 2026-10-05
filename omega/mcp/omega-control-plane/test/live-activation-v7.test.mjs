import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { LiveActivationController } from '../src/cognitive/live-activation.mjs';

async function tempRoot() { return await mkdtemp(join(tmpdir(), 'omega-live-v7-')); }

function fakeOps({ imandraKey = true, ready = { jepa: true, titans: true, r3mem: true } } = {}) {
  const calls = [];
  const router = [];
  return {
    calls,
    router,
    env: imandraKey ? { IMANDRA_API_KEY: 'present-but-never-returned' } : {},
    doctor: async (providerType) => ({ providerType, ready: Boolean(ready[providerType]), capabilities: [`${providerType}.smoke`] }),
    registerRuntime: async (providerType) => { calls.push(['register', providerType]); return { id: `${providerType}-provider` }; },
    runtimeHealth: async (id) => ({ ready: true, providerId: id }),
    invokeRuntime: async (id, operation, payload) => { calls.push(['invoke', id, operation]); return { verified: true, operation, payloadHash: Object.keys(payload ?? {}).length }; },
    configureImandra: async () => { calls.push(['imandra-configure']); return 'imandra'; },
    imandraHealth: async () => ({ ok: true, toolCount: 1 }),
    discoverImandra: async () => ({ toolName: 'reason_about_code' }),
    registerRouter: async (model) => { router.push(model); return model; },
    benchmarkRuntime: async ({ providerId, operation }) => ({ candidateId: `${providerId}:${operation}`, admitted: true, metrics: { samples: 2, p95DurationMs: 5 } })
  };
}

test('live activation activates verified providers, benchmarks them, registers adaptive routes and persists a checkpoint', async () => {
  const root = await tempRoot();
  const ops = fakeOps();
  const controller = new LiveActivationController({ operations: ops, checkpointPath: join(root, 'activation.json') });

  const result = await controller.activate({ benchmark: true, repetitions: 2, includeImandra: true });

  assert.equal(result.state, 'ACTIVE');
  assert.equal(result.completed, true);
  assert.equal(result.providers.jepa.smoke.verified, true);
  assert.equal(result.providers.titans.smoke.verified, true);
  assert.equal(result.providers.r3mem.smoke.verified, true);
  assert.equal(result.imandra.verified, true);
  assert.equal(ops.router.some((m) => m.metadata?.cognitiveProviderId === 'jepa-provider'), true);
  assert.equal(ops.router.some((m) => m.metadata?.mcpProviderId === 'imandra'), true);
  assert.equal(JSON.stringify(result).includes('present-but-never-returned'), false);

  const saved = JSON.parse(await readFile(join(root, 'activation.json'), 'utf8'));
  assert.equal(saved.state, 'ACTIVE');
  assert.equal(saved.completed, true);
});

test('live activation is fail-closed and reports partial state when a secret or runtime is unavailable', async () => {
  const root = await tempRoot();
  const ops = fakeOps({ imandraKey: false, ready: { jepa: false, titans: true, r3mem: false } });
  const controller = new LiveActivationController({ operations: ops, checkpointPath: join(root, 'activation.json') });

  const result = await controller.activate({ benchmark: false, includeImandra: true });

  assert.equal(result.state, 'PARTIAL');
  assert.equal(result.completed, false);
  assert.equal(result.imandra.status, 'OPTIONAL_UNAVAILABLE');
  assert.match(result.imandra.reason, /IMANDRA_API_KEY/);
  assert.equal(result.providers.jepa.status, 'BLOCKED');
  assert.equal(result.providers.titans.status, 'ACTIVE');
  assert.equal(result.providers.r3mem.status, 'BLOCKED');
  assert.equal(ops.calls.some((c) => c[0] === 'register' && c[1] === 'jepa'), false);
  assert.equal(ops.calls.some((c) => c[0] === 'register' && c[1] === 'r3mem'), false);
});

test('status is read-only and reveals only secret presence, never its value', async () => {
  const root = await tempRoot();
  const ops = fakeOps();
  const controller = new LiveActivationController({ operations: ops, checkpointPath: join(root, 'activation.json') });

  const status = await controller.status();

  assert.equal(status.imandra.apiKeyConfigured, true);
  assert.equal(JSON.stringify(status).includes('present-but-never-returned'), false);
  assert.equal(ops.calls.length, 0);
});
