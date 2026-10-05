---
name: omega-data-driven-shadow-tco
description: Use for data-driven decisions, shadow evaluation and tco workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Data-Driven Decisions, Shadow Evaluation and TCO

Use for model/provider selection, replacement, canary analysis and cost-quality-latency tradeoffs.

## Workflow

Use observed production or replay traffic. Record the same request outcome for baseline and candidate with success, latency, cost and domain score. Feed these pairs into `shadow-observe`, then inspect `shadow-summary` before routing traffic away from the incumbent.

Combine shadow data with `decision-rank` and `negotiation-compare`; do not optimize a single benchmark in isolation. Require a minimum evidence window appropriate to the traffic volume and risk.

The built-in ShadowExperiment calculates aggregate deltas from observed samples. It does not claim statistical significance beyond the supplied samples. Use an external experimentation/statistics system when hypothesis testing, confidence intervals or sequential testing are required.
