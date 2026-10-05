---
name: omega-exploration-bandit-sampling
description: Use for exploration, bandits and sampling policy workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Exploration, Bandits and Sampling Policy

Use when a stable strategy should occasionally test an experimental alternative or when a creative provider call needs different sampling parameters.

Register alternatives with the epsilon-greedy bandit, record measured rewards, and use `bandit-select` to balance exploration and exploitation. Exploration remains bounded and must not route high-risk irreversible actions to an unproven arm.

Use `sampling-policy` for deterministic, balanced or creative provider parameters. The policy emits bounded `temperature` and `top_p` values only; it does not mutate model weights. Apply the parameters only when the selected provider/API actually supports them.

Measure experimental outcomes and feed them back through shadow evaluation before adoption.
