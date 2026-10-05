---
name: omega-paradigm-shift-rebaseline
description: Use when monitored loss, API incompatibility or concept drift indicates that patching the current model of the world is no longer reliable and a rebaseline is required.
---

# Paradigm Shift and Rebaseline

Monitor a baseline loss window against a recent loss window. Trigger a paradigm-shift signal only after sustained degradation exceeds the configured ratio.

When `shiftDetected=true`:

1. Freeze further speculative patches to the stale assumption set.
2. Mark affected architectural assumptions as invalidated.
3. Re-read authoritative source code, current schemas, dependency versions and official documentation.
4. Reconstruct the dependency and state model from observed current behavior.
5. Generate new candidate strategies under the new constraints.
6. Validate them with ordinary tests, shadow comparisons and rollout gates.

Action: `shift-observe` / `shift-status`.

This is a real drift-triggered rebaseline controller. It does not implement MAML and must report `mamlApplied=false` unless an actual meta-learning trainer has run.
