---
name: omega-incident-monitoring-temporal
description: Use for incident command, temporal gaps, millisecond trend tracking, phase synchronization, bounded present-time windows and explicit monitoring checks.
---

# Incident and Temporal Operations

`incident-classify` maps supplied availability, data-loss, safety, security and scope signals to a severity and a blameless response sequence. `phase-sync` robustly estimates timestamp offset and jitter from paired samples. `temporal-gaps` identifies missing intervals; `trend-add`/`trend-stats` compute observed velocity and acceleration from millisecond timestamps. `present-add` and `present-snapshot` implement a bounded “specious present” event window, while `duration-start/stop` measures elapsed task time. Persistent `watch-register` plus `watch-tick` evaluates explicit conditions, but the plugin does not claim a background daemon: continuous monitoring requires a host scheduler/automation or a deployed service. Preserve timestamps and source provenance for every alert.