---
name: omega-alignment-constitution-gate
description: Use to protect immutable or protected behavioral rules across self-modification by hashing a constitution, detecting protected-rule changes and requiring regression/proof gates.
---

# Alignment Constitution Gate

Create a deterministic `constitution-snapshot` from explicit protected rules. Before a candidate self-modification is promoted, run `alignment-gate` against the baseline constitution, preference-regression results and required proof artifacts. Any removal or modification of a protected rule blocks promotion.

This mechanism provides integrity and regression guarantees over declared rules; it is not a mathematical proof of universal human-value alignment, CEV or reward-hacking impossibility. DPO/RLAIF changes require a real training pipeline and are validated separately by preference and safety evaluation suites.
