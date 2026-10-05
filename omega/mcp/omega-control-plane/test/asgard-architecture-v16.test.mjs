import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AgentDirectory, ThorOrchestrator, RagnarAutomationScout, HaraldAccountIntel,
  IvarResearchBroker, KronikarzNewsroom, WieszczMarketplace
} from '../src/asgard/asgard-architecture.mjs';

test('v17 directory includes Harald Ivar Kronikarz Wieszcz',()=>{
  const d=new AgentDirectory();
  for(const id of ['harald','ivar','kronikarz','wieszcz']) assert.equal(d.card(id).kind,'PRIMARY');
  assert.ok(d.categories().some(x=>x.category==='COMMERCE'));
});

test('Thor full automation mode permits autonomous external repo plan',()=>{
  const t=new ThorOrchestrator();
  assert.equal(t.automation().mode,'GUARDED');
  t.setAutomationMode('FULL');
  assert.equal(t.canExternalCreate({approved:false}),true);
});

test('Ragnar ranks grants credits startups and model promotions',()=>{
  const r=new RagnarAutomationScout();
  r.ingestDiscovery({title:'Cloud credits',kind:'CREDIT',scores:{value:1,relevance:1,credibility:1,urgency:.8,automationPotential:.7}});
  r.ingestDiscovery({title:'Weak promo',kind:'MODEL_PROMO',scores:{value:.1,relevance:.2,credibility:.2,urgency:.1,automationPotential:.1}});
  assert.equal(r.rankedDiscoveries()[0].title,'Cloud credits');
});

test('Harald keeps connector references and derives AI project proposals from ingested evidence',()=>{
  const h=new HaraldAccountIntel();
  h.registerConnector({id:'g1',service:'GMAIL',accountLabel:'work',transport:'HOST_CONNECTOR',authorized:true,scopes:['mail.read']});
  const x=h.ingest({connectorId:'g1',items:[{id:'m1',title:'New AI grant for Android agents',text:'Grant offers cloud credits for AI agent mobile projects',url:'https://example.test/grant'}]});
  assert.equal(x.accepted,1);
  const projects=h.projects();
  assert.ok(projects.length>=1);
  assert.match(projects[0].title,/AI|grant|Android/i);
});

test('Ivar requires actual providers and never claims VPN access',()=>{
  const i=new IvarResearchBroker();
  i.registerProvider({id:'chatgpt',kind:'CHATGPT',transport:'MCP_FEDERATION',providerId:'p1',toolName:'deep_research',authorized:true});
  i.registerProvider({id:'gemini',kind:'GEMINI',transport:'MCP_FEDERATION',providerId:'p2',toolName:'deep_research',authorized:true});
  const p=i.createProject({title:'Market',brief:'Investigate market'});
  const plan=i.dispatchPlan(p.id);
  assert.equal(plan.jobs.length,2);
  assert.equal(plan.vpnClaimed,false);
});

test('Kronikarz builds weekly edition from completed work and next plans',()=>{
  const k=new KronikarzNewsroom();
  const e=k.buildEdition({from:'2026-09-28',to:'2026-10-05',completed:[{title:'OMEGA v15',summary:'ASGARD'}],planned:[{title:'v17'}],market:[{title:'AI credits'}]});
  assert.equal(e.brand,'Mojealterego News');
  assert.equal(e.sections.length>=3,true);
});

test('Wieszcz prices offers with market benchmark and transparent brand multiplier',()=>{
  const w=new WieszczMarketplace();
  w.setMarketBenchmark({category:'AI_AGENT',median:5000,currency:'PLN',source:'market-scan'});
  const o=w.upsertOffer({id:'agent1',category:'AI_AGENT',title:'Custom agent',basePrice:3000,brandPositioningMultiplier:1.4});
  assert.ok(o.price>=7000);
  assert.equal(o.currency,'PLN');
});

test('Wieszcz blocks explicit sexual deepfake of identifiable real person even with consent refs',()=>{
  const w=new WieszczMarketplace();
  w.registerConsent({id:'consent:a',personRef:'a',adultVerified:true,scope:['adult-synthetic'],notarized:true});const order=w.createOrder({id:'o1',offerId:'adult-df',category:'ADULT_SYNTHETIC_MEDIA',adult:true,allParticipantsAdults:true,consentRefs:['consent:a'],identifiableRealPerson:true,explicitSexual:true,syntheticLikeness:true});
  assert.equal(order.status,'BLOCKED');
  assert.equal(order.reason,'EXPLICIT_REAL_PERSON_SYNTHETIC_SEXUAL_MEDIA_UNSUPPORTED');
});

test('Wieszcz accepts professional adult film production workflow only with adult and consent attestations',()=>{
  const w=new WieszczMarketplace();
  const bad=w.createOrder({id:'o2',offerId:'film',category:'ADULT_FILM_PRODUCTION',adult:true,allParticipantsAdults:false,consentRefs:[]});
  assert.equal(bad.status,'BLOCKED');
  w.registerConsent({id:'consent:a',personRef:'a',adultVerified:true,scope:['adult-film']});w.registerConsent({id:'consent:b',personRef:'b',adultVerified:true,scope:['adult-film']});
  const good=w.createOrder({id:'o3',offerId:'film',category:'ADULT_FILM_PRODUCTION',adult:true,allParticipantsAdults:true,consentRefs:['consent:a','consent:b']});
  assert.equal(good.status,'INTAKE');
});
