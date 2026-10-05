# Live Runtime Supervision v8

Supervise cognitive providers as persistent sidecars with explicit provenance. Health is capability health, not a claim of research equivalence.

Provider selection order:
1. verified external/official runtime when available;
2. verified local reference runtime;
3. fail closed if neither can satisfy the semantic contract.

Secrets are supplied through environment indirection and never persisted. Sidecars must implement deterministic close/shutdown.
