---
name: omega-semantic-dependency-invalidation
description: Use for semantic dependency graphs where changing a concept should invalidate downstream derived concepts lazily. Implements version-aware transitive stale propagation rather than quantum semantic entanglement.
---

# Semantic Dependency Invalidation

Use `semantic-upsert`, `semantic-link` and `semantic-get`. A concept update marks transitive dependents stale instead of rewriting every stored record immediately.

This provides efficient dependency invalidation and lazy recomputation semantics. It is an ordinary versioned graph mechanism; no quantum entanglement or instantaneous physical state change is claimed.
