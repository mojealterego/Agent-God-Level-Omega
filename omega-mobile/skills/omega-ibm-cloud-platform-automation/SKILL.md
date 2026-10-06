---
name: omega-ibm-cloud-platform-automation
description: Use when OMEGA must automate IBM Cloud login/targeting, Container Registry, Code Engine build/deploy/update/status flows, endpoint verification, and IBM-native release evidence from GitHub or GitLab CI.
---

# OMEGA IBM Cloud Platform Automation

## Mission

Provide a first-class IBM Cloud execution lane for build and deployment while preserving the existing OpenAI, Google, Unity, Play, GitHub/GitLab and Termux lanes.

## Automation surface

```text
cloud/ibm/ibm_cloud_automation.py
cloud/github/omega-ibm-cloud.yml
cloud/gitlab/omega-ibm-cloud.yml
```

The automation supports IAM API-key login through the `IBMCLOUD_API_KEY` environment variable, region/resource-group targeting, Code Engine project selection, Container Registry login, container build/push, Code Engine application create/update, URL discovery and health checks.

## Credentials

Use a service ID or purpose-scoped IAM API key stored only in the CI secret store. IBM CLI supports `IBMCLOUD_API_KEY`, so the key need not be embedded in repository content or printed in commands.

## Release safety

Mutating operations require `--apply`. Treat account, resource group, Code Engine project, registry namespace and application name as explicit target identity. Never deploy to a similarly named project by guesswork.

## Completion

Require IBM Cloud provider evidence: image reference/digest, Code Engine application revision/state, URL and optional health probe. A local container build is not deployment completion.
