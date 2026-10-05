---
name: omega-fractal-swarm-bounded
description: Use for recursively decomposing difficult problems into bounded task trees. Enforces branching, depth and total-node budgets so recursive agent decomposition cannot explode without limit.
---

# Bounded Fractal Swarm Planning

Use `fractal-plan` with an explicit decomposition map and hard `branching`, `maxDepth` and `maxNodes` budgets. OMEGA constructs a recursive task tree and records the actual node/depth count.

This is bounded recursive decomposition, not unlimited autonomous spawning. Real sub-agent execution still depends on the host exposing agent/worktree/runtime capabilities.
