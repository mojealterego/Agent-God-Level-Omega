---
name: omega-bayesian-trust-experiments
description: Use for evidence-based A/B comparisons, posterior success estimates and gradual degradation or recovery of agent trust after observed failures and sandbox-verified successes.
---

# Bayesian Experiments and Trust Recovery

The A/B controller maintains Beta-Bernoulli posteriors for binary success outcomes. Require a minimum sample count before recommending a variant. For richer continuous metrics, use the existing shadow/benchmark harness rather than pretending the binary posterior covers latency or cost.

Trust is a separate persistent ledger. Failures reduce trust according to severity; verified sandbox successes can restore trust gradually. Permission tiers can move between FULL, LIMITED and SANDBOX_ONLY.

Actions: `ab-observe`, `ab-summary`, `trust-observe`, `trust-get`.

A trust score is an operational routing/permission signal, not a statement about an agent's moral character or consciousness.
