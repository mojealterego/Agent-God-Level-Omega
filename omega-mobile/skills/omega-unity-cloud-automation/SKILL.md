---
name: omega-unity-cloud-automation
description: Use when OMEGA must build, test, monitor, cancel, or orchestrate Unity projects in cloud CI or Unity Build Automation without depending on a local desktop Unity installation.
---

# OMEGA Unity Cloud Automation

## Purpose

Provide a first-class cloud execution lane for Unity projects while preserving every existing OMEGA execution lane.

Use Unity Build Automation as the authoritative Unity cloud-build service when the target project is configured there. Use GitHub Actions or GitLab CI as orchestration surfaces when they are the repository's native automation authority.

## Capability discovery

Do not assume a Unity connector exists. At task start inspect the live tool registry.

Classify independently:

- Unity Build Automation project/target identity;
- Unity service-account authentication availability;
- GitHub Actions availability;
- GitLab pipeline availability;
- repository source-of-truth and mirror direction;
- artifact download/publish capability;
- local Termux/OMEGA MCP availability for optional post-build inspection.

If no direct Unity provider tool is exposed, the packaged cloud client is the supported execution path:

```text
cloud/unity/unity_build_automation.py
```

It calls Unity Build Automation v2 directly from an authorized cloud runner.

## Supported cloud operations

The packaged client supports:

```text
trigger build
get build status
wait for terminal build status
cancel build
```

Use official Unity Build Automation build numbers as the execution identity. Never claim success from the CI wrapper alone; inspect the Unity build status returned by the service.

## Authentication

Required secret material:

```text
UNITY_SERVICE_ACCOUNT_KEY_ID
UNITY_SERVICE_ACCOUNT_SECRET
```

Required non-secret identifiers:

```text
UNITY_ORG_ID
UNITY_PROJECT_ID
UNITY_BUILD_TARGET_ID
```

Keep credentials in provider-native secret stores. Never place them in plugin files, repository content, logs, prompts, command output, or evidence ledgers.

## GitHub automation

Reference workflow:

```text
cloud/github/omega-unity-cloud.yml
```

Use it only after reading existing `.github/workflows/*`. Merge with repository conventions instead of overwriting existing automation.

The workflow may be invoked manually or reused from another workflow. It pins the build to the GitHub commit SHA and waits for Unity Build Automation to return a terminal status.

## GitLab automation

Reference template:

```text
cloud/gitlab/omega-unity-cloud.yml
```

Use it only after reading `.gitlab-ci.yml` and included pipeline fragments. The template supports an opt-in default-branch automatic mode through `OMEGA_UNITY_CLOUD_AUTO=1` and a manual web-pipeline fallback.

## Unity-native automation

Unity Build Automation also supports repository-driven auto-builds and scheduled builds. Prefer those native triggers when the user's Unity project already uses them and they satisfy the requested cadence.

Do not duplicate the same build trigger in Unity, GitHub, and GitLab unless the workflow explicitly requires multiple independent builds.

## Android target

For Unity Android builds, Unity Build Automation produces the cloud artifact. Use the provider's artifact metadata as source-of-truth, then optionally route the resulting APK/AAB to OMEGA Termux for checksum, package inspection, ADB installation, smoke testing, or device verification when the tunnel is available.

## Failure loop

Use:

`UNITY BUILD → STATUS → FAILURE DETAILS → SOURCE REVISION → PATCH → NEW REVISION → NEW BUILD → VERIFY`

Do not rerun an unchanged failing revision as if that were a repair.

## Completion

A Unity cloud task is complete only when evidence proves the requested terminal state and artifact identity. A queued or started build is not completion.
