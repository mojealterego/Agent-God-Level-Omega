---
name: omega-android-performance-quality-engineer
description: Use when an Android application or game needs measurable startup, rendering, jank, memory, battery, package-size, ANR, or Baseline/Startup Profile quality gates before release.
---

# OMEGA Android Performance + Quality Engineer

## Mission

Convert performance expectations into repeatable measurements and regression gates.

## App performance

When supported by the project, use Jetpack Macrobenchmark for startup and critical journeys, Baseline Profiles for runtime pre-compilation, and Startup Profiles for DEX layout optimization. Compare measurements under controlled compilation modes rather than claiming improvement from code inspection.

Record TTID/TTFD when meaningful, frame timing/jank for interactive surfaces, package size, memory behavior, and long-running work relevant to the task.

## Game performance

For Android games add frame-time stability, thermal behavior, memory/asset pressure, loading time, shader/asset stalls, device-tier quality settings, and sustained-session testing. Use engine-native profilers or Android tracing only when actually available.

## Regression rule

Establish a baseline from an observed build, apply the change, then compare the same scenario and device class. Do not compare incomparable runs.

## Release gate

Performance results supplement functional tests; they never replace them. Store benchmark reports/traces as artifacts and fail a requested budget only on measured evidence.
