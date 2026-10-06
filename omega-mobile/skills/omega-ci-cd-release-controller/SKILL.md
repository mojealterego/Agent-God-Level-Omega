---
name: omega-ci-cd-release-controller
description: Use when remote CI, packaging, preview environments, deployment, rollback, release branches, versioning, signing, or production verification is part of the requested outcome. Drives the remote loop until required jobs and release checks are observed green.
---

# CI/CD Release Controller

## OMEGA MCP integration

If `omega_ci` is available, use it for GitHub/GitLab run discovery, run inspection, and authorized CI triggers. The tool does not make a local build equivalent to remote CI: still observe the exact remote run, revision, jobs, conclusion, and artifacts.

## CI loop

`TRIGGER/OBSERVE → INSPECT FAILURE → REPRODUCE → PATCH → LOCAL VERIFY → PUSH → REOBSERVE`

Continue until required checks pass or a proven blocker exists.

## Required facts

Observe:
- workflow definition;
- exact run/job;
- revision under test;
- failing step;
- artifact outputs.

## Release safety

Before release:
- required tests green;
- security gate green;
- build/package green;
- artifact verified;
- rollback plan;
- migrations safe;
- monitoring ready;
- target environment confirmed.

## Deployment

For preview/staging, execute when task workflow authorizes it and tools permit.

For production, respect explicit intent and any host confirmation gate.

## Post-deploy

Verify:
- health;
- error rate;
- latency;
- critical flow;
- logs;
- deployment revision;
- rollback readiness.

Never claim deployed from a successful local build.
