---
name: omega-active-inference-free-energy
description: Use for expected-free-energy style action selection with explicit preferences, ambiguity and epistemic value. Implements a bounded decision-theoretic approximation and never claims biological free-energy minimization.
---

# Active Inference / Expected Free Energy

Use `omega_asi_architect` action `active-inference` to rank explicit actions by a bounded expected-free-energy objective.

The implementation combines:
- pragmatic risk from preferred outcome probabilities;
- ambiguity costs;
- optional epistemic/information-gain credit.

The runtime ranks actions with lower expected free energy first. It does not claim to implement a biological organism, JEPA training, or the full Free Energy Principle. Inputs must contain explicit outcome probabilities and preferences; missing preferences are not hallucinated.
