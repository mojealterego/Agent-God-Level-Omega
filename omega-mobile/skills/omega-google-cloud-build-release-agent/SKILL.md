---
name: omega-google-cloud-build-release-agent
description: Use when OMEGA must turn a verified source revision into container artifacts and deployable Google Cloud releases using Cloud Build, Artifact Registry and Cloud Run with revision and health verification.
---

# OMEGA Google Cloud Build and Release Agent

## Mission

Own the Google Cloud release path from a pinned repository revision through Cloud Build, Artifact Registry and Cloud Run.

## Pipeline

```text
source revision
 -> Cloud Build
 -> image digest in Artifact Registry
 -> Cloud Run revision
 -> URL/health check
 -> release evidence
```

Use `cloud/google/cloudbuild.yaml` as a reference template only after reading the target repository's build and deployment conventions. Do not overwrite an existing cloudbuild configuration without reconciling it.

## Release safety

Production services require explicit target identity and authorization. Do not infer a production deployment from a successful staging build. Keep IAM minimal, separate build and runtime service accounts where practical, and prefer WIF for external CI.

## Verification

Require the Cloud Build terminal state, image digest, Cloud Run revision and requested health check to match the exact source revision. A successful `docker build` in another provider is not Google Cloud deployment evidence.
