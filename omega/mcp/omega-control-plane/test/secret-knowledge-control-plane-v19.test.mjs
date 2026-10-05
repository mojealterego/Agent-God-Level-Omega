import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes secret knowledge layer',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-sk-cp-'));
  try{
    const p=new OmegaControlPlane({workspaceRoots:[root]});
    const src=await p.secretKnowledge({cwd:root,action:'source-info'});assert.equal(src.id,'trimstray/the-book-of-secret-knowledge');
    const c=await p.secretKnowledge({cwd:root,action:'command-gate',payload:{argv:['sqlmap','-u','https://example.test']}});assert.equal(c.decision,'BLOCK');
  }finally{await rm(root,{recursive:true,force:true});}
});

test('control plane exposes v19 knowledge capabilities',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-sk-cp-'));
  try{
    const p=new OmegaControlPlane({workspaceRoots:[root]});const caps=await p.capabilities();
    for(const id of ['knowledge.secret-knowledge','security.command-risk-gate','operations.safe-diagnostics'])assert.ok(caps.some(x=>x.id===id));
  }finally{await rm(root,{recursive:true,force:true});}
});
