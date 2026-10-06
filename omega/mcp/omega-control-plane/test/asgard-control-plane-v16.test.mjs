import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes ASGARD v21 primary agents',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard16-cp-'));try{const p=new OmegaControlPlane({workspaceRoots:[root]});const out=await p.asgard({cwd:root,action:'command',payload:{text:'LISTA AGENTÓW'}});assert.ok(out.primary.length>=11);assert.ok(out.primary.some(x=>x.id==='harald'));assert.ok(out.primary.some(x=>x.id==='wieszcz'));assert.ok(out.primary.some(x=>x.id==='freyr'));}finally{await rm(root,{recursive:true,force:true});}});
test('control plane exposes v17 internal capabilities',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard16-cp-'));try{const p=new OmegaControlPlane({workspaceRoots:[root]});const caps=await p.capabilities();for(const id of ['asgard.harald','asgard.ivar','asgard.kronikarz','asgard.wieszcz'])assert.ok(caps.some(x=>x.id===id));}finally{await rm(root,{recursive:true,force:true});}});
