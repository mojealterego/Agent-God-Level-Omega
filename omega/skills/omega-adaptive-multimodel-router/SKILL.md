---
name: omega-adaptive-multimodel-router
description: Use when several reasoning or coding models/providers are available and OMEGA must choose adaptively using observed quality, reliability, latency, cost, capability support, task complexity, budget, and controlled exploration.
---

# Adaptive Multi-Model Router

Use `omega_model_router` to maintain an online routing policy.

## Registration

For each model record:
- stable id;
- capabilities;
- baseline quality estimate;
- nominal cost per unit;
- maximum supported complexity;
- provider metadata.

## Learning

After a model call, record:
- success/failure;
- measured quality score;
- measured latency;
- actual cost when available.

OMEGA updates running means and reliability. Routing then applies task constraints first and ranks remaining models by a weighted score combining quality, reliability, latency, cost and a bounded exploration bonus.

## Persistence

Router state is stored in the cognitive state and survives runtime recreation. This makes routing empirical rather than resetting to static preferences every session.

Do not route to a cheaper model that fails the minimum quality, capability, complexity or budget contract. Do not invent quality observations when no evaluator exists; retain the declared baseline until measured evidence is available.

## Executable routing

With `action=invoke`, OMEGA routes first and then executes the selected model through metadata:
- `mcpProviderId` + `toolName` for federated MCP models;
- `cognitiveProviderId` + `operation` for JEPA/Titans/R3Mem/generic provider bridges.

Transport success/failure and latency are recorded automatically. Quality is intentionally not fabricated; it remains unchanged until an external evaluator supplies a measured quality observation.
