import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('Thor finalization is blocked when QA has no observed evidence',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-thor-rf-'));
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    const task=await plane.asgard({cwd:root,action:'thor-submit',payload:{goal:'Przygotuj analizę',requiredCapabilities:['task-intake']}});
    await plane.asgard({cwd:root,action:'thor-assign',payload:{id:task.id}});
    for(const sub of task.subtasks){await plane.asgard({cwd:root,action:'thor-update',payload:{id:task.id,subtaskId:sub.id,status:'DONE',evidence:sub.capability==='quality-gate'?[]:['observed']}});}
    const out=await plane.asgard({cwd:root,action:'thor-finalize',payload:{id:task.id,summary:'Wynik zweryfikowany.'}});
    assert.equal(out.done,false);assert.equal(out.reason,'REALITY_FILTER_BLOCKED');assert.ok(out.realityGate.blockers.some(x=>x.code==='TESTS_NOT_OBSERVED'));
  } finally {await rm(root,{recursive:true,force:true});}
});

test('Thor finalization passes after evidence-backed QA',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-thor-rf-ok-'));
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    const task=await plane.asgard({cwd:root,action:'thor-submit',payload:{goal:'Przygotuj analizę',requiredCapabilities:['task-intake']}});
    await plane.asgard({cwd:root,action:'thor-assign',payload:{id:task.id}});
    for(const sub of task.subtasks){await plane.asgard({cwd:root,action:'thor-update',payload:{id:task.id,subtaskId:sub.id,status:'DONE',evidence:['observed']}});}
    const out=await plane.asgard({cwd:root,action:'thor-finalize',payload:{id:task.id,summary:'Wynik potwierdzono przez wymagany gate.'}});
    assert.equal(out.done,true);assert.equal(out.realityGate.allowedDone,true);assert.equal(out.task.status,'DONE');
  } finally {await rm(root,{recursive:true,force:true});}
});
