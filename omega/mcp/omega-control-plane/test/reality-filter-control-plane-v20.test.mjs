import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes Reality Filter and connects DecisionTrace audit', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-rf-cp-'));
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    const evidence=await plane.realityFilter({cwd:root,action:'evidence-add',payload:{id:'e1',state:'OBSERVED',source:'test',reliability:1}});
    assert.equal(evidence.id,'e1');
    const result=await plane.realityFilter({cwd:root,action:'reality-gate',payload:{
      claims:[{id:'c1',verified:true,evidenceIds:['e1'],source:'test'}],
      decisionTrace:{decision:'ship',claims:[{id:'c1',evidenceIds:['e1']}]},
      testRequired:true,testsObserved:true,artifactRequired:true,artifactPresent:true,responseText:'Test potwierdził wynik.'
    }});
    assert.equal(result.allowedDone,true);
    assert.equal(result.decisionTraceAudit.valid,true);
  } finally {await rm(root,{recursive:true,force:true});}
});

test('control plane Reality Filter blocks raw-secret security payload via Kratos', async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-rf-sec-'));
  try{
    const plane=new OmegaControlPlane({workspaceRoots:[root]});
    const result=await plane.realityFilter({cwd:root,action:'reality-gate',payload:{securityRequired:true,securityPayload:{apiKey:'secret-value'}}});
    assert.equal(result.allowedDone,false);
    assert.equal(result.kratos.passed,false);
    assert.ok(result.blockers.some(x=>x.code==='SECURITY_GATE_FAILED'));
  } finally {await rm(root,{recursive:true,force:true});}
});
