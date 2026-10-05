---
name: omega-pareto-scenario-noise
description: Use for multi-objective Pareto selection, bounded finite-horizon scenario planning and controlled numeric exploration noise in offline candidate search.
---

# Pareto, Scenario Planning and Controlled Noise

Use Pareto-front computation when no single architecture dominates across latency, quality, reliability, cost or energy. Keep all non-dominated options and make the tradeoff explicit.

Use the scenario planner for bounded horizons with an explicit discount factor. This supports strategic debt/lock-in comparisons but must report the actual finite horizon; it must not claim infinite-horizon foresight.

Gaussian perturbation is allowed only for bounded numeric search parameters in offline experiments. Apply bounds and evaluate every candidate through ordinary correctness/security gates.

Actions: `pareto-front`, `scenario-plan`, `noise-perturb`.

Do not inject random noise into production model weights or live critical decisions unless a separately authorized experimentation system controls the rollout.
