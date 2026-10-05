---
name: omega-hdc-vsa-qasm
description: Use for high-dimensional symbolic-vector operations and portable quantum-circuit descriptions. Implements 10k+ bipolar HDC/VSA locally and OpenQASM 3 generation with optional external QPU execution.
---

# HDC/VSA and QASM Bridge

The local VSA layer supports deterministic 10k+ bipolar hypervectors, binding, bundling, permutation and cleanup under bounded corruption. Use `vsa-*` actions.

`qasm-render` creates OpenQASM 3 circuits. `qpu-execute` only runs when a real federated QPU/simulator tool is configured; otherwise it fails closed. OMEGA never claims quantum advantage merely because it generated QASM.
