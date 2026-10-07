# Job Contract Reference

Use this contract for cross-system automation.

```yaml
job_contract:
  job_id: string
  goal: string
  systems: [string]
  targets:
    - system: string
      locator: string
      object_type: string
  allowed_reads: [string]
  allowed_writes: [string]
  invariants: [string]
  preconditions:
    - id: string
      condition: string
      evidence_source: string
  steps:
    - id: string
      depends_on: [string]
      actor: string
      action: string
      target: string
      mutation: boolean
      idempotency_key: string|null
      required_evidence: [string]
  postconditions:
    - id: string
      condition: string
      evidence_source: string
  stop_conditions: [string]
  rollback_plan:
    reversible: boolean
    actions: [string]
  evidence_requirements: [string]
```

## Deterministic conventions

- Derive `job_id` from stable target identifiers plus the current task; do not use it as proof of idempotency unless the downstream tool supports idempotency.
- Keep exact target locators. Do not replace a URL/object ID with a human nickname after discovery.
- Do not execute steps with unresolved dependencies.
- A mutation receipt is necessary but not sufficient. Re-read state for verification whenever the connector supports it.
- For UI automation, capture structured output plus snapshots/screenshots when useful and available.
