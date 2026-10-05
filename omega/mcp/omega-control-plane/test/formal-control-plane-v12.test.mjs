import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes formal architect and persistent assumptions', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-formal-plane-'));
  const plane=new OmegaControlPlane({workspaceRoots:[root]});
  const truth=await plane.formalArchitecture({cwd:root,action:'belnap',payload:{operation:'from-evidence',positive:1,negative:1}});
  assert.equal(truth.label,'BOTH');
  await plane.formalArchitecture({cwd:root,action:'assumption-add',payload:{record:{id:'risk',claim:'migration is reversible',confidence:.4}}});
  const open=await plane.formalArchitecture({cwd:root,action:'assumption-list',payload:{status:'OPEN'}});
  assert.equal(open.length,1);
  await plane.close();
});
