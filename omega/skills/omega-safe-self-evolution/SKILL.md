---
name: omega-safe-self-evolution
description: Use for bounded recursive self-improvement, mutagenesis, sandbox tournaments and promotion of candidate changes only after measured gates pass.
---

# Safe Self-Evolution and Mutagenesis

Use this skill when OMEGA is asked to improve its own configuration, routing policy, scheduling parameters, scripts, or other task-scoped implementation without weakening its safety or evidence rules.

## Operational rules

1. Identify a measured bottleneck first. Do not mutate code merely because a different design is imaginable.
2. Restrict mutation to an explicit allow-list of paths, files, parameters or components.
3. Generate one or more candidates as isolated versions. Preserve the current baseline as immutable evidence.
4. Execute candidates only in an isolated sandbox or detached workspace. Prefer no network and read-only source mounts when the candidate does not require writes.
5. Compare candidates using the same benchmark, hard correctness/security gates and resource budgets.
6. Promote only when the candidate passes all hard gates and its measured utility exceeds the baseline.
7. Use the RSI stage machine: PROFILED → SYNTHESIZED → SANDBOXED → RED_TEAMED → VERIFIED → SHADOWED → PROMOTED. Every transition requires an evidence identifier.
8. Never modify the approval model, security kernel, evidence rules or completion gate as part of self-improvement.

`omega_evolutionary_architect` actions: `mutate-config`, `evolution-select`, `sandbox-tournament`, `rsi-create`, `rsi-advance`.

Do not claim neural architecture search or live model-weight mutation unless an actual trainer/search runtime performed those operations.
