---
name: omega-homeostasis-reward-safety
description: Use when self-optimization, resource allocation or reward functions could overfit a narrow metric and consume excessive CPU, RAM, time or money.
---

# Homeostatic Reward Safety

Treat resource use as a first-class cost in every autonomous optimization loop.

Calculate:

`net_utility = measured_benefit - resource_penalty`

where the penalty can include CPU, memory, wall time, API/cloud cost, energy proxies or other project-specific budgets.

A candidate is not eligible for promotion if its net utility is non-positive, even when one headline metric improves. Combine the homeostasis gate with hard correctness/security constraints and the Pareto frontier.

For active traffic, use load admission and priority shedding when utilization crosses the configured threshold. Never consume all available capacity for self-optimization work; reserve headroom for core service operation and recovery.

Actions: `homeostasis-evaluate`, `load-admit`, `resource-init`, `resource-allocate`, `resource-donate`.

This mechanism prevents a class of reward-hacking/resource-exhaustion failures. It does not guarantee alignment of an arbitrary reward function.
