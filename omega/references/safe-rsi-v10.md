# Safe Recursive Self-Improvement v10

A candidate cannot skip stages.

```text
CREATED
  → PROFILED
  → SYNTHESIZED
  → SANDBOXED
  → RED_TEAMED
  → VERIFIED
  → SHADOWED
  → PROMOTED
```

Each transition requires an evidence identifier. Promotion is a control-plane state transition, not permission to rewrite security policy, user constraints or host safeguards.

Sandbox tournaments use Docker/Podman with network disabled and read-only source mounts by default. Correctness/security hard gates are applied before performance utility.
