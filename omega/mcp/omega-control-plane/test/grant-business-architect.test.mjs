import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GrantBusinessArchitectRuntime } from '../src/business/grant-business-architect.mjs';
import { OmegaControlPlane } from '../src/core/control-plane.mjs';

async function root(){return await mkdtemp(join(tmpdir(),'omega-grant-business-'));}

test('preflight fails closed without verified official programme evidence',async()=>{const dir=await root();try{const rt=new GrantBusinessArchitectRuntime({root:dir});const out=await rt.action({action:'preflight',payload:{program:{id:'p1'},evidence:[{id:'blog',authority:'secondary',verified:true}],data:[]}});assert.equal(out.passed,false);assert.ok(out.blockers.includes('NO_VERIFIED_OFFICIAL_PROGRAMME_EVIDENCE'));}finally{await rm(dir,{recursive:true,force:true});}});

test('unit economics and budget audit are deterministic',async()=>{const dir=await root();try{const rt=new GrantBusinessArchitectRuntime({root:dir});const economics=await rt.action({action:'unit-economics',payload:{price:100,materials:20,labor:10,packaging:5,fixedCosts:1000}});assert.equal(economics.variableCost,35);assert.equal(economics.contribution,65);assert.equal(economics.breakEvenUnits,16);const budget=await rt.action({action:'budget-audit',payload:{items:[{id:'m1',name:'machine',quantity:1,unitPrice:1200,eligibility:'ELIGIBLE',evidenceVerified:true,necessityScore:5,justification:'Required production capacity'}]}});assert.equal(budget.passed,true);assert.equal(budget.total,1200);}finally{await rm(dir,{recursive:true,force:true});}});

test('criteria points require verified evidence and final gate blocks unresolved mandatory criteria',async()=>{const dir=await root();try{const rt=new GrantBusinessArchitectRuntime({root:dir});const matrix=await rt.action({action:'criteria-matrix',payload:{evidence:[{id:'e1',verified:true}],criteria:[{id:'c1',mandatory:true,satisfied:true,maxPoints:10,claimedPoints:10,evidenceIds:['e1']},{id:'c2',mandatory:true,satisfied:true,maxPoints:5,claimedPoints:5,evidenceIds:['missing']}]}});assert.equal(matrix.awardedPoints,10);assert.equal(matrix.rows[1].status,'TO_VERIFY');const gate=await rt.action({action:'final-gate',payload:{preflight:{passed:true,blockers:[]},criteria:matrix.rows,budgetAudit:{passed:true},consistency:{passed:true},requiredAttachments:[]}});assert.equal(gate.passed,false);assert.ok(gate.blockers.some(x=>x.includes('c2')));}finally{await rm(dir,{recursive:true,force:true});}});

test('OmegaControlPlane exposes Grant Business Architect',async()=>{const dir=await root();try{const plane=new OmegaControlPlane({workspaceRoots:[dir]});const out=await plane.grantBusinessArchitect({cwd:dir,action:'missing-data',payload:{items:[{id:'nip',label:'NIP',state:'UNKNOWN',priority:'CRITICAL'}]}});assert.equal(out.canContinue,false);assert.equal(out.CRITICAL.length,1);}finally{await rm(dir,{recursive:true,force:true});}});
