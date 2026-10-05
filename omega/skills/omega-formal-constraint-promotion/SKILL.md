---
name: omega-formal-constraint-promotion
description: Use when a mutation or release has formal proof obligations and promotion must be blocked until the declared obligations are actually verified at the assurance level they claim.
---

# Formal Constraint Promotion

Use `fsm-verify` for finite reachable-state models and `formal-gate` for declared proof artifacts. The finite-state checker exhaustively explores only the supplied bounded state graph up to its configured state limit and returns counterexample paths when an invariant fails. If the bound is exceeded, the result is inconclusive rather than verified.

Formal promotion requires every required obligation to have status VERIFIED from a real verifier or bounded checker whose scope is explicit. This gate does not prove arbitrary source code free of infinite loops, memory leaks or all logical defects. For stronger properties, require Imandra, SMT/model checking, Lean/Coq/Dafny or another real tool and preserve its evidence.
