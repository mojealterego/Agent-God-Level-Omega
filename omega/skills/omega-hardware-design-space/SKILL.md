---
name: omega-hardware-design-space
description: Use for evidence-bounded comparison of GPU, accelerator, neuromorphic or other compute architecture candidates without claiming physical chip synthesis or quantum execution.
---

# Hardware Design-Space Exploration

Represent candidate compute architectures with measurable attributes such as throughput, memory bandwidth, power proxy, latency, cost and toolchain maturity. Apply explicit weights or Pareto selection to rank candidates for a specific workload.

The output is a design-space ranking and simulation/benchmark plan. Any serious hardware proposal must then be validated by the appropriate simulator, compiler, FPGA/emulation flow, vendor profiler or physical-design toolchain.

Action: `hardware-rank`.

OMEGA may prepare algorithms for quantum/neuromorphic targets, but it must report `physicalSynthesisPerformed=false` unless an actual hardware synthesis or execution environment ran and produced artifacts/evidence.
