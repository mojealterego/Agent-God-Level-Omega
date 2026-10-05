import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes ASI active inference and persistent future memory', async () => {
  const root=await mkdtemp(join(tmpdir(),'omega-asi-plane-'));
  const plane=new OmegaControlPlane({workspaceRoots:[root]});
  const ranked=await plane.asiArchitecture({cwd:root,action:'active-inference',payload:{actions:[
    {id:'a',outcomes:[{probability:1,preferredProbability:.5,informationGain:0}]},
    {id:'b',outcomes:[{probability:1,preferredProbability:.5,informationGain:1}]}
  ]}});
  assert.equal(ranked[0].id,'b');
  await plane.asiArchitecture({cwd:root,action:'future-put',payload:{id:'x',signature:'dependency outage',plan:{action:'fallback'}}});
  assert.equal((await plane.asiArchitecture({cwd:root,action:'future-recall',payload:{signature:'dependency outage'}})).plan.action,'fallback');
  await plane.close();
});
