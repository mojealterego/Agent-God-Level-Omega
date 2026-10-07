import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WdaVisualRuntime } from '../src/visual/wda-runtime.mjs';

async function runtime(options={}) {
  const root = await mkdtemp(join(tmpdir(), 'omega-wda-'));
  return { root, rt: new WdaVisualRuntime({ root, ...options }) };
}

test('session-create establishes explicit visual state instead of treating validation as pre-passed', async () => {
  const { rt } = await runtime();
  const session = await rt.action({ action: 'session-create', payload: { id: 'shot-1', rawRequest: 'Replace only the background', expectedSubjectCount: 1 }});
  assert.equal(session.id, 'shot-1');
  assert.equal(session.system, 'WDA_OMEGA_INFINITY');
  assert.equal(session.changeControl.changeBudget, 'LOCAL');
  assert.equal(session.subject.expectedCount, 1);
  assert.equal(session.validation.status, 'UNCHECKED');
  assert.equal(session.validation.checks.identityIntegrity.status, 'UNCHECKED');
});

test('reference roles remain isolated and reject unknown roles', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'refs', rawRequest: 'Use identity A and pose B' } });
  await rt.action({ action: 'reference-add', payload: { sessionId: 'refs', reference: { id: 'A', source: 'face.png', roles: ['IDENTITY_SOURCE'] } } });
  await rt.action({ action: 'reference-add', payload: { sessionId: 'refs', reference: { id: 'B', source: 'pose.png', roles: ['POSE_SOURCE'] } } });
  const mapped = await rt.action({ action: 'reference-map', payload: { sessionId: 'refs' } });
  assert.equal(mapped.authoritative.IDENTITY_SOURCE, 'A');
  assert.equal(mapped.authoritative.POSE_SOURCE, 'B');
  await assert.rejects(() => rt.action({ action: 'reference-role-set', payload: { sessionId: 'refs', referenceId: 'B', roles: ['MAGIC_SOURCE'] } }), /Unsupported reference role/);
});

test('reference conflict resolution prefers explicit priority and otherwise preserves ambiguity', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'conflict', rawRequest: 'portrait' } });
  await rt.action({ action: 'reference-add', payload: { sessionId: 'conflict', reference: { id: 'A', source: 'a.png', roles: ['IDENTITY_SOURCE'], priority: 50 } } });
  await rt.action({ action: 'reference-add', payload: { sessionId: 'conflict', reference: { id: 'B', source: 'b.png', roles: ['IDENTITY_SOURCE'], priority: 10 } } });
  const mapped = await rt.action({ action: 'reference-map', payload: { sessionId: 'conflict' } });
  assert.equal(mapped.authoritative.IDENTITY_SOURCE, 'A');
  assert.equal(mapped.conflicts.length, 1);
});

test('local change budget blocks unauthorized global regeneration', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'budget', rawRequest: 'change the logo', changeBudget: 'LOCAL' } });
  await assert.rejects(() => rt.action({ action: 'edit-plan', payload: { sessionId: 'budget', scope: 'GLOBAL', modified: ['logo'], preserve: ['person', 'background'] }}), /exceeds change budget LOCAL/);
  const plan = await rt.action({ action: 'edit-plan', payload: { sessionId: 'budget', scope: 'LOCAL', modified: ['logo'], preserve: ['person', 'background'] }});
  assert.equal(plan.globalRegeneration, false);
  assert.deepEqual(plan.immutableElements, ['person', 'background']);
});

test('state transition changes only declared domains and records derived changes separately', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'state', rawRequest: 'replace background' } });
  const next = await rt.action({ action: 'state-transition', payload: { sessionId: 'state', modified: ['background'], derived: ['contact-shadow', 'color-spill'], locked: ['identity', 'pose', 'wardrobe'] }});
  assert.deepEqual(next.visualState.modified, ['background']);
  assert.deepEqual(next.visualState.derived, ['contact-shadow', 'color-spill']);
  assert.deepEqual(next.visualState.locked, ['identity', 'pose', 'wardrobe']);
});

test('OpenAI compiler preserves reference roles, edit scope and exact text as structured controls', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'openai', rawRequest: 'Replace background; keep person unchanged', expectedSubjectCount: 1 } });
  await rt.action({ action: 'reference-add', payload: { sessionId: 'openai', reference: { id: 'id', source: 'person.png', roles: ['IDENTITY_SOURCE'] } } });
  await rt.action({ action: 'reference-add', payload: { sessionId: 'openai', reference: { id: 'env', source: 'room.png', roles: ['ENVIRONMENT_SOURCE'] } } });
  await rt.action({ action: 'state-transition', payload: { sessionId: 'openai', locked: ['identity', 'pose', 'wardrobe'], modified: ['background'], derived: ['contact-shadow'] } });
  await rt.action({ action: 'intent-compile', payload: { sessionId: 'openai', exactText: 'WDA Ω∞', typographyEnabled: true } });
  const out = await rt.action({ action: 'provider-compile', payload: { sessionId: 'openai', provider: 'openai', mode: 'edit' } });
  assert.equal(out.provider, 'openai');
  assert.equal(out.action, 'edit');
  assert.match(out.instruction, /IDENTITY_SOURCE=id/);
  assert.match(out.instruction, /LOCKED: identity, pose, wardrobe/);
  assert.match(out.instruction, /EXACT TEXT: WDA Ω∞/);
  assert.equal(out.expectedSubjectCount, 1);
});

test('Gemini compiler separates identity source from pose and environment sources', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'gemini', rawRequest: 'Person A in pose B in room C' } });
  for (const reference of [{ id: 'A', source: 'a.png', roles: ['IDENTITY_SOURCE'] },{ id: 'B', source: 'b.png', roles: ['POSE_SOURCE'] },{ id: 'C', source: 'c.png', roles: ['ENVIRONMENT_SOURCE'] }])
    await rt.action({ action: 'reference-add', payload: { sessionId: 'gemini', reference } });
  const out = await rt.action({ action: 'provider-compile', payload: { sessionId: 'gemini', provider: 'gemini', mode: 'edit' } });
  assert.match(out.instruction, /A supplies IDENTITY_SOURCE only/);
  assert.match(out.instruction, /B supplies POSE_SOURCE only/);
  assert.match(out.instruction, /C supplies ENVIRONMENT_SOURCE only/);
});

test('provider execution is explicit, approval-gated and delegates through configured invoker', async () => {
  const calls=[];
  const { rt } = await runtime({ providerInvoker: async input => { calls.push(input); return { generationId: 'g1' }; } });
  await rt.action({ action: 'session-create', payload: { id: 'exec', rawRequest: 'edit image' } });
  await assert.rejects(() => rt.action({ action: 'provider-execute', payload: { sessionId: 'exec', provider: 'openai', providerId: 'images', toolName: 'edit' } }), /approved=true/);
  const out = await rt.action({ action: 'provider-execute', payload: { sessionId: 'exec', provider: 'openai', providerId: 'images', toolName: 'edit', approved: true } });
  assert.equal(out.executed, true);
  assert.equal(out.result.generationId, 'g1');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].providerId, 'images');
});

test('validation reports PASS FAIL and INCONCLUSIVE instead of asserting unobserved truth', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'validate', rawRequest: 'keep one person', expectedSubjectCount: 1 } });
  const result = await rt.action({ action: 'validate', payload: { sessionId: 'validate', observations: { subjectCount: 1, identitySimilarity: 0.94, lockedRegionChangeRatio: 0, textExact: true, anatomyScore: 0.9, photorealismScore: 0.88 } } });
  assert.equal(result.checks.subjectCount.status, 'PASS');
  assert.equal(result.checks.identityIntegrity.status, 'PASS');
  assert.equal(result.checks.editScope.status, 'PASS');
  assert.equal(result.checks.text.status, 'PASS');
  assert.equal(result.checks.referenceFidelity.status, 'INCONCLUSIVE');
  assert.equal(result.status, 'INCONCLUSIVE');
});

test('failure classifier maps observed validation failures to WDA F1-F13 taxonomy', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'fail', rawRequest: 'portrait', expectedSubjectCount: 1 } });
  await rt.action({ action: 'validate', payload: { sessionId: 'fail', observations: { subjectCount: 2, identitySimilarity: 0.45, lockedRegionChangeRatio: 0.2, textExact: false } } });
  const out = await rt.action({ action: 'failure-classify', payload: { sessionId: 'fail' } });
  assert.ok(out.failures.some(x => x.code === 'F1'));
  assert.ok(out.failures.some(x => x.code === 'F3'));
  assert.ok(out.failures.some(x => x.code === 'F11'));
  assert.ok(out.failures.some(x => x.code === 'F12'));
});

test('correction-apply patches one failure domain without resetting unrelated visual state', async () => {
  const { rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'correct', rawRequest: 'portrait' } });
  await rt.action({ action: 'state-transition', payload: { sessionId: 'correct', locked: ['identity', 'wardrobe'], modified: ['background'] } });
  const out = await rt.action({ action: 'correction-apply', payload: { sessionId: 'correct', domain: 'background', correction: 'use the blue studio wall', preserve: ['identity', 'wardrobe'] }});
  assert.deepEqual(out.visualState.locked, ['identity', 'wardrobe']);
  assert.deepEqual(out.visualState.modified, ['background']);
  assert.equal(out.corrections.at(-1).domain, 'background');
});

test('state-save and state-load persist WDA session state with no provider success claim', async () => {
  const { root, rt } = await runtime();
  await rt.action({ action: 'session-create', payload: { id: 'persist', rawRequest: 'keep composition' } });
  const saved = await rt.action({ action: 'state-save', payload: {} });
  assert.equal(saved.saved, true);
  const raw = JSON.parse(await readFile(join(root, '.omega', 'wda-visual-state.json'), 'utf8'));
  assert.ok(raw.sessions.persist);
  const { rt: rt2 } = await runtime();
  const loaded = await rt2.action({ action: 'state-load', payload: { state: raw } });
  assert.equal(loaded.loaded, true);
  const restored = await rt2.action({ action: 'state-get', payload: { sessionId: 'persist' } });
  assert.equal(restored.intent.rawRequest, 'keep composition');
});

test('composite-execute enforces zero-drift mask through bounded ImageMagick composition', async () => {
  const calls=[];
  const { root, rt } = await runtime({ commandRunner: async input => { calls.push(input); return { exitCode:0, stdout:'', stderr:'' }; } });
  await rt.action({ action: 'session-create', payload: { id: 'composite', rawRequest: 'change only masked region' } });
  const out = await rt.action({ action: 'composite-execute', payload: { sessionId:'composite', sourcePath:'source.png', generatedPath:'generated.png', maskPath:'mask.png', outputPath:'out/final.png' }});
  assert.equal(out.executed,true);
  assert.deepEqual(calls[0].argv,['magick', join(root,'source.png'), join(root,'generated.png'), join(root,'mask.png'), '-compose','over','-composite', join(root,'out/final.png')]);
  await assert.rejects(() => rt.action({ action:'composite-execute', payload:{sessionId:'composite',sourcePath:'../escape.png',generatedPath:'generated.png',maskPath:'mask.png',outputPath:'out.png'} }), /escapes workspace/);
});

test('semantic compiler retains pose environment optics lighting materials color and output as independent domains', async () => {
  const { rt } = await runtime();
  await rt.action({ action:'session-create', payload:{id:'technical',rawRequest:'controlled studio portrait'} });
  const state=await rt.action({ action:'intent-compile', payload:{ sessionId:'technical', pose:{posture:'standing',weightDistribution:'left-leg'}, attire:{garments:'black jacket',materials:'wool'}, environment:{setting:'photo studio',background:'neutral gray'}, camera:{focalLength:'85mm',aperture:'f/2.8'}, lighting:{key:'large softbox camera-left',fill:'negative fill right'}, materials:{skin:'natural pores',fabric:'visible wool weave'}, colorScience:{whiteBalance:'5600K',grading:'neutral cinematic'}, output:{aspectRatio:'4:5',medium:'photographic'} }});
  assert.equal(state.pose.posture,'standing');
  assert.equal(state.environment.setting,'photo studio');
  const compiled=await rt.action({action:'provider-compile',payload:{sessionId:'technical',provider:'generic'}});
  assert.match(compiled.instruction,/POSE SPEC:/);
  assert.match(compiled.instruction,/CAMERA SPEC:/);
  assert.match(compiled.instruction,/LIGHTING SPEC:/);
  assert.match(compiled.instruction,/COLOR SCIENCE SPEC:/);
});
