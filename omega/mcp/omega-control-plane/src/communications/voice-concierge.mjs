const PERSONAS = Object.freeze({
  mila: Object.freeze({ id: 'mila', name: 'Mila', style: 'sweet-playful-coquettish', acousticTarget: 'bright, warm, smiling, light, agile pace' }),
  vera: Object.freeze({ id: 'vera', name: 'Vera', style: 'assertive-intelligent-direct', acousticTarget: 'lower, controlled, articulate, confident, moderate pace' }),
  dante: Object.freeze({ id: 'dante', name: 'Dante', style: 'dark-luxury-playboy-roguish', acousticTarget: 'resonant, confident, dry humor, measured dominance without aggression' }),
  leo: Object.freeze({ id: 'leo', name: 'Leo', style: 'wealthy-relaxed-chillout', acousticTarget: 'relaxed, warm, low-pressure, slightly slower pace' })
});

const CHANNEL_PROVIDERS = Object.freeze({
  phone: Object.freeze(['autocalls-ai', 'kaicalls', 'call-e', 'ringcentral-phone']),
  sms: Object.freeze(['ringcentral-phone', 'kaicalls', 'autocalls-ai']),
  whatsapp: Object.freeze(['autocalls-ai']),
  email: Object.freeze(['gmail', 'agentmail']),
  calendar: Object.freeze(['google-calendar']),
  telegram: Object.freeze([]),
  signal: Object.freeze([]),
  threema: Object.freeze([]),
  messenger: Object.freeze([]),
  'instagram-dm': Object.freeze([]),
  snapchat: Object.freeze([])
});

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function choosePersona({ requestedPersona, scenario = '', ageKnownAdult = false } = {}) {
  const explicit = normalize(requestedPersona);
  let id = PERSONAS[explicit] ? explicit : null;
  const text = normalize(scenario);
  if (!id) {
    if (/complaint|dispute|premium|negotiat|angry|high[- ]value/.test(text)) id = 'vera';
    else if (/vip|concierge|wellness|real estate|retention|calm|relax/.test(text)) id = 'leo';
    else if (/nightlife|luxury|automotive|high-energy|playboy/.test(text)) id = 'dante';
    else id = 'mila';
  }
  const flirtationEligible = ageKnownAdult === true && ['mila', 'vera', 'dante'].includes(id);
  return {
    ...PERSONAS[id],
    flirtation: flirtationEligible ? 'light-non-explicit' : 'disabled',
    constraints: [
      'never impersonate a real person',
      'never claim to be human when asked directly',
      'no sexual pressure or coercion',
      'stop flirtation on discomfort or opt-out'
    ]
  };
}

function routeChannel({ requestedChannel = 'phone', direction = 'outbound' } = {}) {
  const channel = normalize(requestedChannel).replace(/\s+/g, '-');
  const providers = CHANNEL_PROVIDERS[channel] ?? [];
  return {
    channel,
    direction: normalize(direction) || 'outbound',
    providerCandidates: [...providers],
    directAdapterKnown: providers.length > 0,
    executionState: 'PLAN_ONLY'
  };
}

function buildPlan(input = {}) {
  const direction = normalize(input.direction) || 'outbound';
  const persona = choosePersona(input);
  const channel = routeChannel({ requestedChannel: input.requestedChannel ?? input.channel ?? 'phone', direction });
  return {
    kind: 'omega-voice-concierge-plan',
    executionState: 'PLAN_ONLY',
    direction,
    objective: String(input.objective ?? input.scenario ?? '').trim(),
    persona,
    channel,
    gates: {
      aiDisclosure: 'required when applicable by law/provider policy and whenever asked',
      consentRequired: direction === 'outbound',
      optOutMustBeHonored: true,
      doNotCallMustBeHonored: true,
      providerConfirmationRequired: true,
      humanApprovalRequiredFor: [
        'refunds-or-compensation',
        'binding-pricing-exceptions',
        'contracts',
        'legal-or-regulatory-claims',
        'identity-verification-with-sensitive-data'
      ]
    },
    handoffs: {
      appointments: 'google-calendar-or-live-provider-calendar',
      email: 'gmail-or-agentmail',
      contacts: 'google-contacts',
      sms: 'ringcentral-phone-or-live-voice-provider'
    },
    unsupportedDirectChannels: Object.entries(CHANNEL_PROVIDERS).filter(([, providers]) => providers.length === 0).map(([name]) => name)
  };
}

export class VoiceConciergeRuntime {
  action(input = {}) {
    const action = normalize(input.action || 'plan');
    if (action === 'persona-route') return choosePersona(input);
    if (action === 'channel-route') return routeChannel(input);
    if (action === 'plan' || action === 'conversation-plan') return buildPlan(input);
    if (action === 'appointment-handoff') {
      return { executionState: 'PLAN_ONLY', target: 'google-calendar-or-live-provider-calendar', requireAvailabilityCheck: true, requireTimezone: true, requireProviderConfirmation: true };
    }
    if (action === 'opt-out-gate') {
      return { allowed: input.optedOut !== true && input.blacklisted !== true, reason: input.optedOut === true ? 'OPTED_OUT' : input.blacklisted === true ? 'BLACKLISTED' : 'ALLOWED' };
    }
    if (action === 'post-call-evidence') {
      return {
        executionState: 'EVIDENCE_ONLY',
        facts: Array.isArray(input.facts) ? input.facts.map(String) : [],
        commitments: Array.isArray(input.commitments) ? input.commitments.map(String) : [],
        bookingConfirmed: input.bookingConfirmed === true,
        followUpRequired: input.followUpRequired === true
      };
    }
    throw new Error('Unsupported voice concierge action: ' + action);
  }
}

export { PERSONAS, CHANNEL_PROVIDERS, choosePersona, routeChannel, buildPlan };
