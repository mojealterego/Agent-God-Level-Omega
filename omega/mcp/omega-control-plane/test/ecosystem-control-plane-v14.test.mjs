import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes ecosystem architect', async()=>{const root=await mkdtemp(join(tmpdir(),'omega-eco-cp-'));try{const p=new OmegaControlPlane({workspaceRoots:[root]});const r=await p.ecosystemArchitecture({cwd:root,action:'skill-upsert',payload:{id:'x',name:'x-skill',description:'test skill'}});assert.equal(r.id,'x');const c=await p.ecosystemArchitecture({cwd:root,action:'skill-catalog'});assert.equal(c.length,1);}finally{await rm(root,{recursive:true,force:true});}});
