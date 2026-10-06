import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes ElevenLabs media doctor without leaking secret', async () => {
  const root = await mkdtemp(join(tmpdir(), 'omega-media-plane-'));
  const plane = new OmegaControlPlane({ workspaceRoots:[root], env:{ELEVENLABS_API_KEY:'top-secret'} });
  const result = await plane.mediaArchitecture({ cwd:root, action:'doctor', payload:{} });
  assert.equal(result.available,true);
  assert.equal(result.auth.ref,'ELEVENLABS_API_KEY');
  assert.equal(JSON.stringify(result).includes('top-secret'),false);
});
