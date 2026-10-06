import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FreyrCloudOnboarding, AgentDirectory, ThorOrchestrator } from '../src/asgard/asgard-architecture.mjs';
import { AsgardRuntime } from '../src/asgard/asgard-runtime.mjs';

async function root(){return await mkdtemp(join(tmpdir(),'omega-v21-'));}

test('Agent directory exposes Freyr as a primary cloud funding agent',()=>{
  const d=new AgentDirectory(); const f=d.card('Freyr');
  assert.equal(f.id,'freyr'); assert.equal(f.category,'CLOUD_FUNDING');
  assert.ok(f.capabilities.includes('cloud-account-onboarding'));
});

test('Thor routes grant and cloud-credit work to Freyr domain capabilities',()=>{
  const t=new ThorOrchestrator(); const task=t.submit({goal:'Znajdź grant i cloud credits dla startupu oraz przygotuj onboarding konta'});
  assert.ok(task.capabilities.includes('cloud-credit-discovery'));
  assert.ok(task.subtasks.some(x=>x.agent==='cloud-funding-analyst'));
});

test('Freyr account binding stores only hashes and references, not raw email',()=>{
  const f=new FreyrCloudOnboarding();
  const out=f.bindAccount({expectedEmail:'target@example.com',observedEmail:'target@example.com',authorized:true,emailRef:'FREYR_GOOGLE_EMAIL'});
  assert.equal(out.state,'BOUND'); assert.equal(out.rawEmailStored,false);
  assert.equal(JSON.stringify(out).includes('target@example.com'),false);
  assert.equal(out.emailRef,'FREYR_GOOGLE_EMAIL');
});

test('Freyr detects connector account mismatch',()=>{
  const f=new FreyrCloudOnboarding();
  const out=f.bindAccount({expectedEmail:'a@example.com',observedEmail:'b@example.com',authorized:true});
  assert.equal(out.state,'CONNECTOR_ACCOUNT_MISMATCH'); assert.equal(out.emailMatch,false);
});

test('program requires evidence before being treated as verified',()=>{
  const f=new FreyrCloudOnboarding();
  const p=f.ingestProgram({provider:'Cloud X',program:'Startup Credits',url:'https://example.com/startup',verifiedAt:new Date().toISOString(),evidence:[]});
  assert.equal(p.verificationState,'UNVERIFIED');
  const q=f.qualify(p.id,{region:'PL'}); assert.equal(q.eligible,false); assert.ok(q.issues.includes('PROGRAM_NOT_VERIFIED'));
});

test('signup plan blocks legal, captcha, KYC, phone and payment gates instead of bypassing them',()=>{
  const f=new FreyrCloudOnboarding();
  f.bindAccount({expectedEmail:'a@example.com',observedEmail:'a@example.com',authorized:true});
  const p=f.ingestProgram({provider:'Cloud X',program:'Startup Credits',url:'https://example.com/startup',verifiedAt:new Date().toISOString(),evidence:[{url:'https://example.com/startup'}],requiresCaptcha:true,requiresKyc:true,requiresPhoneVerification:true,requiresPaymentMethod:true,requiresLegalAttestation:true});
  f.registerAdapter({id:'x',provider:'Cloud X',transport:'MCP_FEDERATION',authorized:true,autoSignup:true,providerId:'cloudx',toolName:'signup'});
  const a=f.createApplication({programId:p.id}); const plan=f.planSignup({applicationId:a.id});
  for(const blocker of ['TERMS_APPROVAL_REQUIRED','CAPTCHA_REQUIRED','KYC_REQUIRED','PHONE_VERIFICATION_REQUIRED','PAYMENT_METHOD_APPROVAL_REQUIRED','LEGAL_ATTESTATION_REQUIRED']) assert.ok(plan.blockers.includes(blocker));
  assert.equal(plan.autoExecutable,false); assert.equal(plan.captchaBypassClaimed,false); assert.equal(plan.kycBypassClaimed,false);
});

test('verified no-blocker program can become auto-executable through authorized adapter',()=>{
  const f=new FreyrCloudOnboarding();
  f.bindAccount({expectedEmail:'a@example.com',observedEmail:'a@example.com',authorized:true});
  const p=f.ingestProgram({provider:'Cloud Y',program:'Developer Free Tier',kind:'FREE_TIER',url:'https://example.com/free',verifiedAt:new Date().toISOString(),evidence:[{url:'https://example.com/free'}],requiresTermsAcceptance:false});
  f.registerAdapter({id:'y',provider:'Cloud Y',transport:'MCP_FEDERATION',authorized:true,autoSignup:true,providerId:'cloudy',toolName:'signup'});
  const a=f.createApplication({programId:p.id}); const plan=f.planSignup({applicationId:a.id});
  assert.equal(plan.ready,true); assert.equal(plan.autoExecutable,true); assert.deepEqual(plan.blockers,[]);
});

test('runtime executes signup only through a real authorized MCP adapter',async()=>{
  const dir=await root(); try{
    const seen=[]; const r=new AsgardRuntime({root:dir,mcpInvoker:async req=>{seen.push(req);return {accountRef:'acct-1'};}});
    await r.action({action:'freyr-account-bind',payload:{expectedEmail:'a@example.com',observedEmail:'a@example.com',authorized:true}});
    const p=await r.action({action:'freyr-program-ingest',payload:{provider:'Cloud Y',program:'Free',kind:'FREE_TIER',url:'https://example.com/free',verifiedAt:new Date().toISOString(),evidence:[{url:'https://example.com/free'}],requiresTermsAcceptance:false}});
    await r.action({action:'freyr-adapter-register',payload:{id:'y',provider:'Cloud Y',transport:'MCP_FEDERATION',authorized:true,autoSignup:true,providerId:'cloudy',toolName:'signup'}});
    const a=await r.action({action:'freyr-application-create',payload:{programId:p.id}});
    const out=await r.action({action:'freyr-signup-execute',payload:{applicationId:a.id}});
    assert.equal(out.executed,true); assert.equal(out.application.status,'ACCOUNT_CREATED'); assert.equal(seen.length,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('HOST_BROWSER signup remains a host orchestration boundary',async()=>{
  const dir=await root(); try{
    const r=new AsgardRuntime({root:dir});
    await r.action({action:'freyr-account-bind',payload:{expectedEmail:'a@example.com',observedEmail:'a@example.com',authorized:true}});
    const p=await r.action({action:'freyr-program-ingest',payload:{provider:'Cloud Z',program:'Free',kind:'FREE_TIER',url:'https://example.com/free',verifiedAt:new Date().toISOString(),evidence:[{url:'https://example.com/free'}],requiresTermsAcceptance:false}});
    await r.action({action:'freyr-adapter-register',payload:{id:'z',provider:'Cloud Z',transport:'HOST_BROWSER',authorized:true,autoSignup:true}});
    const a=await r.action({action:'freyr-application-create',payload:{programId:p.id}});
    const out=await r.action({action:'freyr-signup-execute',payload:{applicationId:a.id}});
    assert.equal(out.executed,false); assert.equal(out.reason,'HOST_ORCHESTRATION_REQUIRED');
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('Freyr imports compatible Ragnar funding discoveries',async()=>{
  const dir=await root(); try{
    const r=new AsgardRuntime({root:dir});
    const d=await r.action({action:'ragnar-discovery-ingest',payload:{kind:'CLOUD_CREDIT',title:'Startup credits',provider:'Provider A',url:'https://example.com/a',evidence:[{url:'https://example.com/a'}],scores:{value:1,relevance:1,credibility:1,urgency:.5,automationPotential:.8}}});
    const out=await r.action({action:'freyr-import-ragnar',payload:{id:d.id,requiresTermsAcceptance:true}});
    assert.equal(out.imported,true); assert.equal(out.program.provider,'Provider A');
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('Freyr credit ledger and integration plan preserve security handoff',()=>{
  const f=new FreyrCloudOnboarding();
  const p=f.ingestProgram({provider:'Cloud X',program:'Credits',url:'https://example.com',verifiedAt:new Date().toISOString(),evidence:[{url:'https://example.com'}]});
  const a=f.createApplication({programId:p.id}); f.updateApplication(a.id,{status:'ACCOUNT_CREATED'}); const c=f.recordCredit({applicationId:a.id,provider:'Cloud X',amount:500,currency:'USD'});
  assert.equal(f.creditLedger()[0].id,c.id); const plan=f.integrationPlan(a.id); assert.equal(plan.ready,true); assert.ok(plan.steps.some(x=>x.owner==='kratos')); assert.ok(plan.steps.some(x=>x.owner==='ragnar'));
});

test('v21 state persists Freyr data without raw email',async()=>{
  const dir=await root(); try{
    const r=new AsgardRuntime({root:dir});
    await r.action({action:'freyr-account-bind',payload:{expectedEmail:'secret-user@example.com',observedEmail:'secret-user@example.com',authorized:true,emailRef:'FREYR_GOOGLE_EMAIL'}});
    const p=await r.action({action:'freyr-program-ingest',payload:{provider:'Cloud X',program:'Credits',url:'https://example.com',verifiedAt:new Date().toISOString(),evidence:[{url:'https://example.com'}]}});
    await r.action({action:'freyr-application-create',payload:{programId:p.id}});
    const save=await r.action({action:'state-save'}); const raw=await readFile(save.path,'utf8');
    assert.equal(save.version,21); assert.match(raw,/"version": 21/); assert.equal(raw.includes('secret-user@example.com'),false); assert.match(raw,/FREYR_GOOGLE_EMAIL/);
    const r2=new AsgardRuntime({root:dir}); const load=await r2.action({action:'state-load'}); assert.equal(load.version,21); assert.equal((await r2.action({action:'freyr-programs'})).length,1);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
