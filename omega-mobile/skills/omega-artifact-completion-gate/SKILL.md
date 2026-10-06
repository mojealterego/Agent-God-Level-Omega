---
name: omega-artifact-completion-gate
description: Final OMEGA v3 gate. Use before declaring any software task complete. Requires observed evidence for applicable requirements, tests, build, security, runtime, CI, repository audit, artifacts, signing, deployment, and rollback readiness.
---

# Artifact and Completion Gate

## Universal equation

```text
DONE =
SCOPE_MATCH
AND REQUIREMENTS_VERIFIED
AND BEHAVIOR_VERIFIED
AND TEST_GATE
AND BUILD_GATE
AND QUALITY_GATE
AND SECURITY_GATE
AND REPOSITORY_GATE
AND CI_GATE_IF_REQUIRED
AND ARTIFACT_GATE_IF_REQUIRED
AND RUNTIME_GATE_IF_REQUIRED
AND RELEASE_GATE_IF_REQUIRED
AND NO_REQUIRED_UNKNOWN
```

## Repository gate

Observe:
- correct repository;
- expected branch;
- final revision;
- final diff;
- no unrelated accidental changes;
- no secret material;
- no hidden checker/test weakening;
- no unexpected generated junk.

## Test gate

Require the level appropriate to the change:
- focused;
- integration;
- full relevant suite;
- e2e/runtime;
- property/fuzz;
- formal/static checks where required.

## Artifact gate

When `omega_artifact_inspect` is available, use it as the baseline local artifact existence/size/extension/SHA-256 observation before applying platform-specific signing, package, install, or runtime checks.


For requested artifact verify:
- exact path/id;
- exists;
- non-zero size;
- correct format;
- expected version/variant;
- checksum;
- signing/metadata when applicable;
- open/install validation when tooling permits.

## Android

For APK/AAB, verify as applicable:
- Gradle build success;
- tests;
- lint;
- emulator/device flow when available;
- artifact path;
- package id;
- version code/name;
- signing state for release.

## Web/backend

Verify as applicable:
- production build;
- migrations;
- health;
- auth/authz;
- browser/runtime flow;
- accessibility;
- observability;
- deployment revision.

## CI

If CI is part of acceptance, local green is insufficient. Observe the required remote run green on the intended revision.

## Blocker semantics

If one required predicate cannot be satisfied:
- mark not done;
- identify exact predicate;
- cite observed blocker;
- state the minimum external action needed.

Never label partial completion as final completion.
