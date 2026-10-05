---
name: omega-energy-aware-compute
description: Use when compute decisions must respect energy, power, thermal or carbon budgets and optimization should account for measured resource consumption instead of latency alone.
---

# Energy-Aware Compute

Use `energy-evaluate` to calculate Joules, kWh and carbon estimate from measured power, duration and carbon intensity. Apply hard energy, power and carbon budgets before selecting an execution plan. Use `energy-rank` to prefer lower-energy candidates when correctness and other hard requirements are equal.

Do not claim Landauer-limit optimization from ordinary telemetry. Cooling-system or power-distribution control is outside this local layer unless an authorized infrastructure connector exposes those controls. Treat telemetry timestamps, measurement source and uncertainty as part of the evidence record.
