# Evidence Ledger

```yaml
evidence_ledger:
  job_id: string
  entries:
    - step_id: string
      system: string
      target: string
      action: string
      mutation_receipt: string|unknown
      before_evidence: []
      after_evidence: []
      verifier_check: string
      status: PASS|FAIL|UNVERIFIABLE
      notes: string
  final_status: VERIFIED_SUCCESS|PARTIAL_SUCCESS|BLOCKED_UNVERIFIED|FAILED_RECOVERED|FAILED_REQUIRES_ACTION
```

Keep evidence concise. Never include passwords, tokens, cookies, or secret values.
