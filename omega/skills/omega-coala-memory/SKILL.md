---
name: omega-coala-memory
description: Use when the agent needs cognitively distinct working, episodic, semantic, and procedural memories plus a decision/action loop. Applies the CoALA decomposition while keeping actual storage and retrieval mechanisms explicit and verifiable.
---

# CoALA Memory

## Memory classes

### Working memory
Small, bounded, task-local state needed for immediate reasoning.

### Episodic memory
Specific events and outcomes with temporal provenance. Store through the bitemporal journal.

### Semantic memory
Durable generalized knowledge indexed hierarchically through SHIMI-style retrieval.

### Procedural memory
Reusable action procedures, triggers, tool sequences, and verification routines.

## Decision loop

Memory exists to support action selection:

`RETRIEVE → ORIENT → DECIDE → ACT → OBSERVE RESULT → REFLECT → CONSOLIDATE`

## Consolidation

Successful or repeatedly useful episodes may produce semantic insights or procedural rules.

Never silently convert one failed anecdote into a universal procedure.

## Forgetting

Working memory is intentionally bounded. Durable memory is retained according to provenance, utility, staleness, and project policy.

## Tool use

Use `omega_memory` for persistent episodic/semantic/procedural operations when the OMEGA MCP control plane is present.
