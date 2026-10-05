---
name: omega-proof-obligation-promotion
description: Use when a proposed mutation or architectural change has formal, static or runtime proof obligations that must be independently evidenced before promotion.
---

# Proof-Obligation Promotion Gate

Represent each required invariant as a proof obligation with an explicit status and evidence identifier.

Examples:
- a solver result for an authorization invariant;
- a model-checking run for a state machine;
- a static analyzer result for memory-safety properties;
- a bounded proof from Imandra/SMT tooling;
- a runtime invariant backed by a deterministic test when formal proof is unavailable.

The gate passes only when every required obligation has status `PASS` and carries real evidence. `UNKNOWN`, inferred success, missing evidence or a prose claim must fail the gate.

Action: `proof-gate`.

Use this together with `omega-neuro-symbolic-verification` and external formal providers. Do not claim that a generic theorem prover can prove absence of memory leaks or all runtime failures in arbitrary software.
