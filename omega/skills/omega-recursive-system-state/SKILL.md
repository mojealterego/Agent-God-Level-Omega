---
name: omega-recursive-system-state
description: Use when OMEGA must maintain an explicit versioned representation of its current capabilities, limits, metrics and bottlenecks before planning self-improvement.
---

# Recursive System-State Representation

Maintain a durable `System State` snapshot containing only observable and declared information:
- version/revision;
- enabled capabilities;
- current tool/provider availability;
- resource limits;
- latency/error metrics;
- active constraints;
- known bottlenecks;
- assurance level and unresolved blockers.

Before a self-improvement cycle, read the latest snapshot and compare it with the previous state. Use the diff to choose work that targets measured regressions or newly available capabilities.

Actions: `state-snapshot`, `state-latest`, `state-diff`.

The state file is introspection data, not machine consciousness. Do not describe it as awareness or claim millisecond-complete self-knowledge when underlying telemetry is sampled or incomplete.
