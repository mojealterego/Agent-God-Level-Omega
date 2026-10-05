---
name: omega-reasoning-fabric
description: Use for complex decisions requiring Graph-of-Thought composition, R2-style cost-aware model routing, structured decision cycles, Reflexion from prior outcomes, adversarial gating, and evidence-sensitive correction loops.
---

# OMEGA Reasoning Fabric

## Graph of Thought

Represent candidate reasoning products as a directed acyclic graph:
- thought nodes;
- dependency edges;
- scores;
- merged thoughts;
- frontier candidates.

Reject cycles in the explicit thought dependency graph.

## R2-style routing

When multiple models/providers are truly available, route subtasks by:
- required capability;
- estimated complexity;
- minimum quality;
- cost budget.

Do not invent model quality scores. Use observed benchmark/task history or explicit configuration.

## Decision cycle

Use:

`OBSERVE → ORIENT → DECIDE → ACT → REFLECT → OBSERVE`

Invalid phase transitions are rejected.

## Reflexion

Store action/outcome/lesson episodes with quality weighting.

A lesson is reusable only when grounded by outcome evidence.

## Adversarial gate

Candidate decisions:
- `ACCEPT`
- `CORRECT`
- `RETRY`
- `RETRIEVE_EVIDENCE`
- `ESCALATE`

Missing evidence can never become `ACCEPT`.

Critical/high findings must block acceptance according to configured policy.

## MCP

Use `omega_reasoning` for executable graph/gate/decision/AB-MCTS state when available.
