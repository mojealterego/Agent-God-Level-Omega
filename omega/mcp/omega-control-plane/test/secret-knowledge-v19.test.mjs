import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SecretKnowledgeCatalog, CommandRiskClassifier, SafeDiagnosticPlanner, KnowledgePolicyGate } from '../src/knowledge/secret-knowledge-architecture.mjs';
import { SecretKnowledgeRuntime } from '../src/knowledge/secret-knowledge-runtime.mjs';

test('catalog exposes curated defensive knowledge and reference-only offensive entries',()=>{
  const c=new SecretKnowledgeCatalog();
  assert.equal(c.source().id,'trimstray/the-book-of-secret-knowledge');
  assert.ok(c.search('Lynis').some(x=>x.id==='security.host-audit'));
  const off=c.search('Metasploit')[0];
  assert.equal(off.mode,'REFERENCE_ONLY');
  assert.equal(off.risk,'HIGH');
});

test('source observer detects upstream fingerprint change',()=>{
  const c=new SecretKnowledgeCatalog();
  const a=c.observeSource({readmeSha:'a',commitSha:'1'});
  const b=c.observeSource({readmeSha:'a',commitSha:'1'});
  const d=c.observeSource({readmeSha:'b',commitSha:'2'});
  assert.equal(a.changed,false);assert.equal(b.changed,false);assert.equal(d.changed,true);
});

test('risk classifier allows read-only diagnostics but blocks exploit and destructive commands',()=>{
  const r=new CommandRiskClassifier();
  assert.equal(r.classify(['ps','aux']).risk,'READ_ONLY');
  assert.equal(r.classify(['sqlmap','-u','https://example.test']).risk,'CREDENTIAL_OR_EXPLOIT');
  assert.equal(r.classify(['rm','-rf','/tmp/x']).risk,'DESTRUCTIVE');
  assert.equal(r.classify(['nmap','-sS','example.test']).risk,'NETWORK_ACTIVE');
});

test('packet capture requires review and high risk is hard-blocked',()=>{
  const g=new KnowledgePolicyGate();
  assert.equal(g.evaluate({argv:['tcpdump','-i','any']}).decision,'REVIEW');
  assert.equal(g.evaluate({argv:['mimikatz']}).decision,'BLOCK');
  assert.equal(g.evaluate({argv:['uname','-a']}).decision,'ALLOW');
});

test('remote diagnostic playbooks require explicit authorization',()=>{
  const p=new SafeDiagnosticPlanner();
  assert.throws(()=>p.plan({playbook:'dns-resolve',target:'example.com'}),/authorization/);
  const local=p.plan({playbook:'dns-resolve',target:'localhost'});assert.equal(local.steps.length,1);
  const remote=p.plan({playbook:'http-head',target:'https://example.com',authorizedTarget:true});assert.equal(remote.steps[0].classification.risk,'NETWORK_QUERY');
});

test('runtime executes only read-only allowed diagnostic steps',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-sk-'));
  const calls=[];
  try{
    const rt=new SecretKnowledgeRuntime({root,commandRunner:async(c)=>{calls.push(c);return {exitCode:0,stdout:'ok',stderr:''};}});
    const out=await rt.action({action:'diagnostic-run',payload:{playbook:'system-overview'}});
    assert.equal(out.executed,true);assert.ok(calls.length>=4);assert.ok(calls.every(x=>x.sideEffect==='R'));
  }finally{await rm(root,{recursive:true,force:true});}
});

test('runtime never auto-runs remote network query without authorization gate',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-sk-'));const calls=[];
  try{
    const rt=new SecretKnowledgeRuntime({root,commandRunner:async(c)=>{calls.push(c);return {exitCode:0};}});
    await assert.rejects(()=>rt.action({action:'diagnostic-run',payload:{playbook:'tls-summary',target:'example.com'}}),/authorization/);
    assert.equal(calls.length,0);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('state persistence stores catalog metadata and reloads it',async()=>{
  const root=await mkdtemp(join(tmpdir(),'omega-sk-'));
  try{
    const rt=new SecretKnowledgeRuntime({root});
    await rt.action({action:'catalog-upsert',payload:{id:'custom.x',category:'ops',name:'X'}});
    const saved=await rt.action({action:'state-save'});assert.equal(saved.saved,true);
    const rt2=new SecretKnowledgeRuntime({root});const loaded=await rt2.action({action:'state-load'});assert.equal(loaded.loaded,true);
    assert.ok((await rt2.action({action:'catalog-search',payload:{query:'custom.x'}})).length===1);
  }finally{await rm(root,{recursive:true,force:true});}
});
