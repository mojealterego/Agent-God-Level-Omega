---
name: omega-performance-resource-governor
description: Use when performance, scale, latency, throughput, memory, battery, GPU/CPU, build time, or infrastructure cost matters. Measures before optimizing, enforces budgets, profiles real bottlenecks, and prevents speculative low-level rewrites.
---

# Performance and Resource Governor

## Baseline first

Measure before modifying:
- latency distribution;
- throughput;
- CPU;
- memory;
- allocations;
- I/O;
- network;
- DB queries;
- bundle/binary size;
- build time;
- battery/energy where applicable.

## Budget

Define measurable limits from project requirements or current ratchet.

## Optimization order

1. eliminate unnecessary work;
2. fix algorithmic complexity;
3. fix I/O/query patterns;
4. improve caching/batching;
5. reduce allocations/copies;
6. tune concurrency;
7. tune compiler/runtime;
8. consider hardware-specific code last.

## Low-level code

For CUDA/PTX/SASS/ROCm/Vulkan/DirectX:
- inspect actual target hardware/toolchain;
- profile;
- verify numerical correctness;
- benchmark against baseline;
- keep a portable fallback unless requirements forbid it.

No low-level rewrite based solely on theoretical intuition.

## Statistical rule

Use multiple samples and report distribution/variance, not a single lucky run.
