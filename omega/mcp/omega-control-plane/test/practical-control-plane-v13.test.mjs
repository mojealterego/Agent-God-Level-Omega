import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes practical architecture with persistent state', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-practical-')); const plane=new OmegaControlPlane({workspaceRoots:[root]});
  try{
    const cost=await plane.practicalArchitecture({cwd:root,action:'cost-estimate',payload:{items:[{optimistic:1,mostLikely:2,pessimistic:3}]}});
    assert.equal(cost.base,2);
    await plane.practicalArchitecture({cwd:root,action:'personalization-set',payload:{key:'x',value:1}});
    assert.equal((await plane.practicalArchitecture({cwd:root,action:'personalization-get',payload:{key:'x'}})).value,1);
  } finally { await plane.close(); }
});
