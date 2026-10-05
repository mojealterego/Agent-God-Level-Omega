import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

test('control plane exposes ASGARD and LISTA AGENTÓW',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard-cp-'));try{const p=new OmegaControlPlane({workspaceRoots:[root]});const out=await p.asgard({cwd:root,action:'command',payload:{text:'LISTA AGENTÓW'}});assert.ok(out.primary.length>=6);assert.equal(out.primary[0].id,'thor');}finally{await rm(root,{recursive:true,force:true});}});
test('control plane Thor creates task',async()=>{const root=await mkdtemp(join(tmpdir(),'asgard-cp-'));try{const p=new OmegaControlPlane({workspaceRoots:[root]});const out=await p.asgard({cwd:root,action:'thor-submit',payload:{goal:'Zbuduj MCP i plugin'}});assert.ok(out.subtasks.some(x=>x.agent==='mcp-engineer'));assert.ok(out.subtasks.some(x=>x.agent==='plugin-engineer'));}finally{await rm(root,{recursive:true,force:true});}});
