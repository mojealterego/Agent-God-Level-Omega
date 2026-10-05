---
name: omega-self-healing-debugger
description: Use for failing builds, tests, CI, runtime errors, crashes, flaky behavior, dependency failures, configuration mismatches, and incomplete implementations. Runs a bounded evidence-driven repair loop until the failing gate passes or a proven external blocker remains.
---

# Self-Healing Debugger

## Repair loop

`REPRODUCE → MINIMIZE → CLASSIFY → LOCALIZE → ROOT CAUSE → FIX → TARGETED TEST → REGRESSION TEST → BROADER VERIFY`

## Classification

Distinguish:
- code defect;
- test defect;
- environment mismatch;
- dependency/version issue;
- flaky timing;
- external service failure;
- auth/permission problem;
- missing capability.

## Rules

- never weaken the assertion to hide the defect;
- never skip a failing test merely to get green;
- never retry flaky failures indefinitely;
- never edit multiple unrelated subsystems before localizing the cause;
- never claim fixed until the original reproduction passes.

## Flake protocol

For suspected flake:
- capture frequency;
- isolate nondeterminism;
- control clock/random/network where possible;
- rerun statistically meaningful times within budget;
- fix the nondeterminism or quarantine only with explicit project policy.

## External blocker

A blocker is proven only when:
- the local system is verified up to the boundary;
- the external dependency failure is directly observed;
- retries appropriate to the failure class are exhausted;
- there is no authorized alternative path.
