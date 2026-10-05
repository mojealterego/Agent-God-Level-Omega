---
name: omega-layered-consistency-antiparadox
description: Use before recursive self-modification to reject direct contradictions, dependency cycles and recursion-budget violations. Provides bounded structural consistency checks without claiming a solution to the halting problem or Gödel completeness.
---

# Layered Consistency / Anti-Paradox Gate

Use `consistency-gate` before promoting recursive mutations. The gate detects:
- direct contradictory assertions;
- dependency/self-reference cycles;
- recursion-depth budget violations.

A passing result means only that these bounded checks passed. It does not prove termination for arbitrary programs, Gödel consistency, or absence of all semantic paradoxes. Combine it with tests, formal tools and runtime sandboxing where stronger assurance is required.
