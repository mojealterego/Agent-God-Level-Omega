---
name: omega-delegation-api-contracts
description: Use for delegation through contracts workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Delegation Through Contracts

Use when work should be divided among sub-agents, services or cross-functional teams.

Delegate outcomes through explicit contracts: inputs, outputs, schema, latency budget, error model, observability, allowed side effects, ownership and acceptance tests. Avoid prescribing internal implementation when the boundary is sufficient.

Use existing OMEGA multi-agent worktree isolation for code changes and `omega_meta_architect` `dag-run` for dependency-aware command execution. Independent nodes can run concurrently; dependents start only after predecessors pass.

Delegation never transfers authority beyond the original task. Destructive, production, permission or spending actions remain subject to the same approval gates as the parent task.
