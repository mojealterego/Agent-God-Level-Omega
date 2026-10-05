---
name: omega-neuro-symbolic-verification
description: Use when high assurance is needed for invariants, authorization, concurrency, state machines, financial logic, numerical behavior, protocols, or safety-critical code. Escalates from tests to solver/model/proof tools while precisely stating the assurance achieved.
---

# Neuro-Symbolic Verification

## Assurance ladder

0. inspection
1. example tests
2. property/fuzz tests
3. static/dataflow analysis
4. SMT/SAT/model checking
5. machine-checked proof

Never report level 4 or 5 without actual verifier output.

## Formalization contract

For every formal model state:
- what production behavior is modeled;
- abstractions;
- omitted behaviors;
- assumptions;
- properties;
- model-to-code correspondence check.

## Counterexample pipeline

`PROPERTY → VERIFY → COUNTEREXAMPLE → MINIMIZE → REPRODUCE → PATCH → REVERIFY`

## Relevant properties

Examples:
- authorization monotonicity;
- no impossible state transition;
- idempotent retry;
- lock release;
- transaction conservation;
- bounded queue/state;
- serialization round-trip;
- numeric tolerance;
- no secret output.

## Tool honesty

Use Imandra, TLA+, Alloy, Dafny, Lean, Coq, Isabelle, CBMC, Kani, Prusti, Z3 or other formal tooling only when actually available.

Do not simulate a successful proof with an LLM.
