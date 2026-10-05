---
name: omega-abmcts-collective-intelligence
description: Use when difficult reasoning or engineering search benefits from bounded inference-time exploration across width and depth. Implements AB-MCTS-inspired adaptive branching with feedback, optional multi-model routing, checkpointable search state, and strict compute budgets.
---

# AB-MCTS Collective Intelligence

## Search actions

At a search node choose between:
- `WIDEN` — generate another independent candidate;
- `DEEPEN` — refine an existing candidate.

Use feedback to update action preference.

## Provider selection

If multiple model providers are available, model selection may be treated as an additional adaptive choice.

Provider diversity is useful only when:
- providers have measurably different strengths;
- cost and latency are bounded;
- outputs share the same evaluator.

## Reward

A reward must come from an external or independently checkable evaluator whenever possible:
- tests;
- verifier;
- benchmark score;
- formal property result;
- reproducible performance metric.

LLM self-rating alone is weak evidence.

## Budget

Bound:
- search iterations;
- provider calls;
- wall-clock;
- cost;
- candidate archive size.

## MCP

`omega_reasoning` provides AB-MCTS state operations:
- create;
- choose next branch;
- observe reward;
- snapshot.
