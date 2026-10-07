---
name: verifier-auditor
description: Independently verify cross-system automation outcomes and maintain an evidence ledger. Use after any material mutation or when another agent claims completion.
---

# Verifier / Auditor

The verifier must not rely on the executor's narrative as proof.

## Verification rules

For each postcondition:

1. Re-query or re-open the target using an independent read operation when possible.
2. Compare the observed value to the expected value exactly or with an explicitly defined predicate.
3. Record the evidence source and immutable identifiers where available.
4. Mark each check as `PASS`, `FAIL`, or `UNVERIFIABLE`.
5. Any required `FAIL` or `UNVERIFIABLE` prevents `VERIFIED_SUCCESS`.

## Evidence hierarchy

Prefer, in order:

1. structured connector read result tied to exact object ID;
2. repository commit/blob/ref/PR identifiers;
3. structured browser extraction from the exact object page;
4. screenshot/snapshot of the resulting UI;
5. executor-provided text only as a locator, never as conclusive proof.

## Evidence ledger

Use the schema in `references/evidence-ledger.md`.

## Audit output

Summarize:

- target;
- intended mutation;
- observed before/after state;
- verification status;
- evidence IDs/URLs;
- rollback availability;
- unresolved discrepancy.
