import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function makeRoot(){return await mkdtemp(join(tmpdir(),'omega-assurance-cp-v23-'));}

test('control plane exposes OMEGA v23 assurance runtime',async()=>{
  const root=await makeRoot();
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    const out=await plane.assuranceArchitecture({cwd:root,action:'action-audit',payload:{workflow:`name: t\non: [push]\njobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: vendor/action@main\n`}});
    assert.equal(out.passed,false);
    assert.ok(out.findings.some(x=>x.code==='ACT002'));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('assurance runtime persists governed knowledge and scoped sessions',async()=>{
  const root=await makeRoot();
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    await plane.assuranceArchitecture({cwd:root,action:'knowledge-docset-upsert',payload:{id:'docs',prefix:'docs',roles:{writer:['rw'],approver:['approve']},requiresApproval:[{path:'policy'}]}});
    await plane.assuranceArchitecture({cwd:root,action:'knowledge-identity-upsert',payload:{id:'thor',roles:['writer','approver']}});
    const write=await plane.assuranceArchitecture({cwd:root,action:'knowledge-write',payload:{identity:'thor',path:'docs/notes/a.md',content:'x'}});
    assert.equal(write.pending,false);
    await plane.assuranceArchitecture({cwd:root,action:'session-save',payload:{provider:'chatgpt',workItem:'issue-7',workflow:'fix',sessionId:'s1',unresolvedTasks:[]}});
    await plane.assuranceArchitecture({cwd:root,action:'state-save',payload:{}});
    const plane2=new OmegaControlPlane({workspaceRoots:[root]});
    await plane2.assuranceArchitecture({cwd:root,action:'state-load',payload:{}});
    const resumed=await plane2.assuranceArchitecture({cwd:root,action:'session-resume',payload:{provider:'chatgpt',workItem:'issue-7',workflow:'fix'}});
    assert.equal(resumed.resumable,true);
    assert.equal(resumed.sessionId,'s1');
  } finally {await rm(root,{recursive:true,force:true});}
});

test('toolchain doctor is evidence based and does not claim missing external tools',async()=>{
  const root=await makeRoot();
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    const out=await plane.assuranceArchitecture({cwd:root,action:'toolchain-doctor',payload:{commands:['definitely-not-a-real-omega-v23-tool']}});
    assert.equal(out.available,true);
    assert.equal(out.tools[0].available,false);
  } finally {await rm(root,{recursive:true,force:true});}
});
