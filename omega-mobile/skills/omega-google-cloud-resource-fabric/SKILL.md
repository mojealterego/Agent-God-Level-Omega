---
name: omega-google-cloud-resource-fabric
description: Use when OMEGA must operate Google Cloud across an authorized organization, folders, billing accounts and many projects instead of one fixed project, including discovery, project brokering/factory, API enablement, IAM, service accounts, GitHub WIF, Vertex AI, Cloud Build, Artifact Registry and Cloud Run.
---

# OMEGA Google Cloud Resource Fabric

## Mission

Treat Google Cloud as an organization/folder/project fabric rather than one hard-coded project. Discover the authorized resource hierarchy, select the least-privilege existing project that satisfies the task, or create an isolated project under an authorized folder when policy permits.

## Execution substrate

```text
cloud/google/gcp_resource_fabric.py
cloud/google/gcp_automation.py
cloud/google/gemini_vertex.py
cloud/google/cloudbuild.yaml
cloud/github/omega-gcp-resource-fabric.yml
cloud/gitlab/omega-gcp-resource-fabric.yml
```

## Bootstrap model

Full cross-project automation requires one bootstrap principal that already has explicit organization/folder/billing permissions. The fabric must never manufacture organization access. Prefer GitHub/GitLab OIDC -> Workload Identity Federation -> service-account impersonation or direct federated access. A dedicated control project may host the workload identity pool; it is an identity/control plane, not the only deployment project.

## Resource discovery

Before mutation observe:

- active Google identity;
- visible organizations;
- folders and parent hierarchy;
- billing accounts visible to the principal;
- active projects, labels and lifecycle state;
- enabled APIs in the chosen target;
- service accounts and IAM bindings relevant to the task;
- quotas/region constraints required by the requested product.

## Project broker

Score existing projects by explicit labels and requested services. Prefer an existing compatible isolated project when it has the required billing, region and security posture. Create a new project only when authorized, using an explicit organization or folder parent and billing account.

Project creation, billing linkage, folder creation, IAM changes, service-account creation and API enablement are mutating operations and require the script's `--apply` guard.

## GitHub WIF

The fabric can bootstrap a GitHub OIDC provider scoped by repository attribute and grant the selected external principal Workload Identity User on a service account. Never grant an entire workload identity pool when a repository- or environment-scoped principal set can be used.

## Product services

Route only services required by the product. Typical engineering lanes include Vertex AI/Gemini, Cloud Build, Artifact Registry, Cloud Run, Secret Manager, Logging and Monitoring. Additional services are enabled explicitly from task requirements rather than by a universal all-APIs switch.

## Completion

A GCP task is complete only when provider-native evidence identifies the organization/folder/project target, active identity, exact project or resource, build/deployment revision, endpoint/artifact identity and requested health state.

## One-time control-plane bootstrap

For a real deployment use `cloud/google/remote-mcp/bootstrap-gcp.sh`. It can discover a single visible organization and billing account, isolate automation under an `OMEGA-Automation` folder, create/reuse the control project, configure service accounts, required APIs, Artifact Registry and GitHub OIDC Workload Identity Federation without service-account JSON keys. It refuses to guess when multiple organization or billing targets exist.

`OMEGA_ENABLE_ORG_FABRIC=1` is an explicit high-impact opt-in for inherited automation roles on the dedicated OMEGA folder plus Billing User on the selected billing account. Do not grant those roles silently.
