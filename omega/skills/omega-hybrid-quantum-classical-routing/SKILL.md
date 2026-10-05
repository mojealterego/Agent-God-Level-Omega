---
name: omega-hybrid-quantum-classical-routing
description: Use to choose between actually available classical and quantum/simulator providers using observed or estimated execution cost while never asserting quantum advantage without measured evidence.
---

# Hybrid Quantum-Classical Routing

Use `hybrid-route` with explicit provider availability and estimated execution time/cost. Route only to a provider that is actually available. If both are available, choose according to the declared estimate or policy; if neither is available, return unavailable.

The QPU execution path remains the v11 fail-closed OpenQASM/MCP bridge. Routing a job to a QPU does not establish quantum advantage, sub-linear memory search or superiority over a classical baseline. Those claims require matched benchmark evidence on the same problem and correctness criteria.
