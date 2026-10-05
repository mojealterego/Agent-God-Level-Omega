const ORDER = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

export class AdversarialGate {
  constructor({ correctAt = 'high', escalateCodes = ['POLICY_CONFLICT', 'AUTH_REQUIRED'] } = {}) {
    this.correctAt = correctAt;
    this.escalateCodes = new Set(escalateCodes);
  }

  decide({ candidateId, evidenceComplete, findings = [], retryable = false }) {
    if (!evidenceComplete) return { candidateId, decision: 'RETRIEVE_EVIDENCE', reasons: ['EVIDENCE_INCOMPLETE'] };
    const escalations = findings.filter((f) => this.escalateCodes.has(f.code));
    if (escalations.length) return { candidateId, decision: 'ESCALATE', reasons: escalations.map((x) => x.code) };
    const blocking = findings.filter((f) => (ORDER[f.severity] ?? 0) >= ORDER[this.correctAt]);
    if (blocking.length) return { candidateId, decision: retryable ? 'RETRY' : 'CORRECT', reasons: blocking.map((x) => x.code ?? x.severity) };
    return { candidateId, decision: 'ACCEPT', reasons: [] };
  }
}
