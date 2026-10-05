---
name: omega-adversarial-review
description: Use after each meaningful implementation slice and before release. Attacks the proposed change with counterexamples across correctness, security, concurrency, data integrity, compatibility, UX, accessibility, operations, and performance.
---

# Adversarial Review

## Assume the implementation is wrong

Search actively for a falsifying case.

## Attack dimensions

### Correctness
- empty/null;
- min/max;
- malformed input;
- duplicate input;
- partial state;
- stale state.

### Concurrency
- double execution;
- race;
- deadlock;
- cancellation;
- timeout;
- reentrancy.

### Security
- auth bypass;
- IDOR;
- injection;
- path traversal;
- XSS/CSRF/SSRF;
- secret leakage;
- privilege escalation.

### Data integrity
- partial transaction;
- retry duplication;
- migration rollback;
- schema skew;
- eventual consistency.

### Compatibility
- old client/new server;
- old data/new code;
- dependency/API version drift.

### UX/accessibility
- keyboard;
- focus;
- errors;
- loading;
- offline/retry;
- small viewport.

### Operations
- missing logs;
- unbounded retries;
- alert blindness;
- no rollback.

### Performance
- N+1;
- unbounded collection;
- excessive allocations;
- lock contention;
- hot-loop I/O.

## Counterexample priority

Prioritize:
`impact × likelihood × detectability_gap`

## Closure

Every credible counterexample must become one of:
- rejected with evidence;
- mitigated in code;
- covered by test/check;
- recorded as an explicit accepted limitation.

Do not leave silent risks.
