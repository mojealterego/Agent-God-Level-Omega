---
name: omega-counterfactual-causal-reasoning
description: Use when architectural decisions need explicit causal assumptions, interventions, counterfactual simulations or what-if comparisons rather than correlation-only reasoning.
---

# Counterfactual and Causal Reasoning

Use a structural causal model when a decision depends on the consequence of changing one variable while holding other structural relationships fixed.

## Workflow

- Define nodes, parent relationships, structural coefficients and baseline context explicitly.
- Keep the causal graph acyclic and inspect every assumed edge; an invented edge is not evidence.
- Compute the baseline outcome first.
- Apply an intervention with do-style semantics by overriding the selected node, then recompute downstream nodes.
- Compare the delta and attach the model assumptions to the decision record.
- For security counterfactuals, combine the causal result with sandbox execution and synthetic red-team cases; the graph alone cannot prove software behavior.
- Rebuild the model when new observed evidence contradicts an assumed relationship.

`omega_evolutionary_architect` action: `causal-counterfactual`.

This is an explicit structural model, not automatic causal discovery and not a claim that Pearl-style identification has been established from observational data.
