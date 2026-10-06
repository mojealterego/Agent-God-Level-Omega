import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function root(){return await mkdtemp(join(tmpdir(),'omega-omni-cp-v22-'));}

test('control plane exposes Omni v22 competency runtime without separate plugin',async()=>{const dir=await root();try{const plane=new OmegaControlPlane({workspaceRoots:[dir]});const map=await plane.omniArchitect({cwd:dir,action:'competency-map',payload:{}});assert.equal(Object.keys(map).length,17);assert.ok(map['google-intelligence'].includes('asgard.harald'));}finally{await rm(dir,{recursive:true,force:true});}});

test('Omni v22 quality gate remains fail-closed when required Reality evidence is absent',async()=>{const dir=await root();try{const plane=new OmegaControlPlane({workspaceRoots:[dir]});const out=await plane.omniArchitect({cwd:dir,action:'quality-gate',payload:{claims:[{id:'c1',text:'artifact built',required:true,verified:false,evidenceIds:[]}]}});assert.equal(out.passed,false);}finally{await rm(dir,{recursive:true,force:true});}});
