---
name: omega-live-runtime-supervisor
description: Use when local or remote cognitive runtimes must be activated, probed, benchmarked, routed, restarted, or kept fail-closed. Supervises one-shot live activation, provider health, real smoke inference, dependency readiness, environment-backed credentials, circuit state, adaptive-router admission and persistent activation checkpoints.
---

# Live Runtime Supervisor v8

## Primary command

Use `omega_live_activation` whenever V-JEPA 2, Titans, R3Mem or Imandra should become operational.

The activation pipeline is:

`DOCTOR → REGISTER → HEALTH → SMOKE → BENCHMARK → ROUTER → CHECKPOINT`

A provider is never inserted into the adaptive router before smoke verification succeeds.

## Status mode

`action=status` is read-only. It checks built-in runtime readiness and reports only whether `IMANDRA_API_KEY` is configured; secret values are never returned.

## Activation mode

`action=activate` performs bounded activation:

1. JEPA: prefer real Meta V-JEPA 2 when available; otherwise use the native JEPA reference runtime with explicit non-equivalence provenance.
2. Titans: prefer `titans-pytorch` when available; otherwise use the native fast-weight test-time memory runtime.
3. R3Mem contract: use `OMEGA_R3MEM_FACTORY` when configured; otherwise use the exact reversible local fallback and mark it non-equivalent to trained R3Mem.
4. Imandra: optional by default; configure CodeLogician when `IMANDRA_API_KEY` is present. Set `requireImandra=true` when formal verification is a mandatory completion gate.
5. Persist the result to `.omega/live-activation.json`.

## States

- `ACTIVE`: all required capabilities are verified and routed. Optional external upgrades may remain unavailable.
- `PARTIAL`: at least one requested provider is active and at least one is blocked.
- `BLOCKED`: no requested provider reached the activation gate.

## Fail-closed rules

Do not route a provider when:
- dependency is missing;
- credential is missing;
- circuit is open;
- model failed to load;
- smoke result is not verified;
- benchmark fails a hard gate;
- expected capability is absent.

Reference fallbacks are allowed only when their provenance explicitly says they are not research-equivalent. Never present them as the unavailable external implementation.
