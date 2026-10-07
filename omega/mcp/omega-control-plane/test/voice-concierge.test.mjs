import assert from 'node:assert/strict';
import test from 'node:test';

import { VoiceConciergeRuntime } from '../src/communications/voice-concierge.mjs';

test('voice concierge routes premium dispute to Vera and remains plan-only', () => {
  const runtime = new VoiceConciergeRuntime();
  const plan = runtime.action({ action: 'plan', scenario: 'premium customer dispute and urgent appointment', direction: 'outbound', requestedChannel: 'phone', ageKnownAdult: true });
  assert.equal(plan.persona.id, 'vera');
  assert.equal(plan.executionState, 'PLAN_ONLY');
  assert.equal(plan.gates.consentRequired, true);
  assert.equal(plan.channel.providerCandidates.includes('autocalls-ai'), true);
});

test('voice concierge disables flirtation when adulthood is not explicit', () => {
  const runtime = new VoiceConciergeRuntime();
  const persona = runtime.action({ action: 'persona-route', requestedPersona: 'mila' });
  assert.equal(persona.flirtation, 'disabled');
});

test('voice concierge does not fabricate unsupported direct social-DM adapters', () => {
  const runtime = new VoiceConciergeRuntime();
  const route = runtime.action({ action: 'channel-route', requestedChannel: 'telegram' });
  assert.equal(route.directAdapterKnown, false);
  assert.deepEqual(route.providerCandidates, []);
});
