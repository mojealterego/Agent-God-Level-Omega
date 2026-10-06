---
name: omega-cloud-devops-control-plane
description: Use when OMEGA must execute repository, CI/CD, pull or merge request, branch, commit, artifact, or release workflows through GitHub and GitLab cloud connectors, including provider failover and dual-host verification.
---

# OMEGA Cloud DevOps Control Plane

## Purpose

Provide a cloud execution lane that remains useful when the Android/Termux runtime is offline, sleeping, disconnected, or simply not the strongest authority for a repository-host operation.

This skill does not turn GitHub or GitLab into interchangeable stores. Treat each provider as an independent source of truth until repository identity, branch, commit and mirroring state are observed.

## Capability discovery

Before any cloud mutation, discover the provider tools actually exposed in the current host.

Classify these independently:

- GitHub repository read/write;
- GitHub Actions run/job/artifact access;
- GitLab project read/write;
- GitLab pipeline/job access;
- pull request and merge request operations;
- branch/ref updates;
- release or artifact access;
- current authentication and write authorization.

Do not infer availability from `.app.json` alone. App bindings are routing dependencies, not proof of authentication.

## Routing priority

For GitHub-hosted state, prefer the GitHub connector over local `git` when the task is about server-side metadata, pull requests, Actions, reviews, branch protection, remote commits, artifacts or permissions.

For GitLab-hosted state, prefer the GitLab connector for merge requests, pipelines, jobs, project metadata, remote commits, approvals and server-side repository state.

Use Termux OMEGA MCP for local compilation, device work, emulator/ADB work, local repositories and deterministic build/test loops when that lane is available and stronger.

## Cloud automation contract

OMEGA may install provider-native CI only after reading the target repository's existing CI configuration and preserving unrelated workflows.

Packaged templates are available at:

```text
cloud/github/omega-ci.yml
cloud/gitlab/omega-ci.yml
```

They are reference implementations, not permission to overwrite an existing pipeline. Merge their gates into repository-native conventions when a target repository already has CI.

## Dual-provider invariant

Never claim GitHub and GitLab are synchronized merely because both contain similarly named repositories.

Before cross-provider automation, verify:

```text
repository identity
source/default branch
HEAD commit or an explicit mapping
mirror direction if configured
pipeline revision
artifact revision
```

If a provider is a mirror, use the authoritative upstream for writes unless the user's repository policy says otherwise.

## Failure handling

A cloud API failure is evidence about that provider only. Do not silently repeat the same mutation through another provider unless the repositories are verified mirrors and the alternate action preserves the exact acceptance criteria.

For CI failures:

`RUN → JOB → LOG → ROOT CAUSE → PATCH → NEW REVISION → NEW RUN → VERIFY`

Do not treat a rerun of an unchanged broken revision as repair.

## Security

Never move provider tokens through chat, repository files, logs, CI variables, command arguments or OMEGA evidence records.

Use provider-native authentication and secret stores. Keep workflow permissions minimal. Prefer read-only defaults and elevate write permissions only for the specific job that needs them.

## Completion

A cloud operation is complete only when provider-native evidence proves the requested end state: exact branch/ref, commit, PR/MR state, CI conclusion, artifact identity or release state.
