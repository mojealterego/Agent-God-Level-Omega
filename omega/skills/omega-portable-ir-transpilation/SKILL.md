---
name: omega-portable-ir-transpilation
description: Use for small deterministic arithmetic kernels that need a portable representation and verified source generation for supported target languages without pretending to be a universal compiler.
---

# Portable IR Transpilation

Represent bounded arithmetic kernels as a typed IR with named inputs and a pure expression tree. `ir-compile` currently supports JavaScript, Python and C99 for a restricted operator set. Reject unknown variables, duplicate inputs, unsupported operators and unsupported targets.

This layer is intentionally not a universal intent-to-machine-code translator. Assembly, Verilog/VHDL, neuromorphic microcode and quantum circuits require separate verified compilers or adapters. When targeting hardware, pass the generated algorithm through the existing HDL/QASM/toolchain gates rather than fabricating low-level code from unconstrained prose.
