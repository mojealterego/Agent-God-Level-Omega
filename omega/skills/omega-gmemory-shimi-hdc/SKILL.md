---
name: omega-gmemory-shimi-hdc
description: Use for long-horizon multi-agent memory that needs hierarchical collaboration traces, semantic top-down retrieval, associative symbolic binding, and cross-trial reuse. Combines G-Memory-inspired tiers, SHIMI-style hierarchy, and HDC/VSA holographic representations.
---

# G-Memory + SHIMI + HDC

## G-Memory hierarchy

Maintain three collaboration layers:

1. **interaction graph** — condensed agent-to-agent execution traces;
2. **query graph** — task/question abstractions linked to interactions;
3. **insight graph** — reusable generalized lessons linked to queries.

Retrieve bidirectionally:
- high-level insights first for strategy;
- fine-grained interactions when execution details are needed.

## SHIMI-style semantic hierarchy

Index durable semantic memory under hierarchical concept paths.

Retrieval combines:
- query terms;
- hierarchy-path similarity;
- exact evidence terms.

This is an operational hierarchical index, not a claim of reproducing any paper's trained model exactly.

## HDC / holographic memory

Use high-dimensional vector-symbolic representations for:
- binding concepts;
- bundling related symbols;
- associative retrieval;
- compact similarity search.

The implementation is deterministic HD/VSA, not a claim that arbitrary repository state is magically embedded without storage.

## MCP actions

Use `omega_memory`:
- `interaction-add`
- `query-add`
- `insight-add`
- `semantic-add`
- `hdc-store`
- `retrieve`
