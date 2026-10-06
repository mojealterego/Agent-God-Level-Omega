---
name: omega-google-cloud-platform-automation
description: Use when OMEGA must authenticate to Google Cloud, inspect projects, enable APIs, manage Artifact Registry, submit Cloud Build jobs, deploy Cloud Run services, and verify Google Cloud state through WIF/ADC and gcloud automation.
---

# OMEGA Google Cloud Platform Automation

## Mission

Provide a Google Cloud execution lane for ChatGPT Android workflows without requiring a desktop. Prefer Workload Identity Federation for GitHub/GitLab deployment pipelines so long-lived service-account keys are not stored in CI.

## Automation surface

Packaged implementation:

```text
cloud/google/gcp_automation.py
cloud/google/cloudbuild.yaml
cloud/github/omega-google-cloud.yml
cloud/gitlab/omega-google-cloud.yml
```

Supported operations include auth/status inspection, API enablement, Artifact Registry repository creation, Cloud Build submission, Cloud Run deployment, service description, URL retrieval and health verification.

## Mutation guard

Mutating subcommands default to plan-only and require `--apply`. This prevents a discovered credential from silently enabling billable APIs or deploying production services.

## Authentication

Prefer GitHub/GitLab OIDC -> Google Workload Identity Federation -> short-lived credentials. Use service-account impersonation only when needed by the target API. Never commit service-account JSON keys.

## Verification

Cloud Build success does not prove Cloud Run health. Verify the exact build ID, produced image digest, deployed revision, service URL and an explicit health endpoint when the task requires a running service.
