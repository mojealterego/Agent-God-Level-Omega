---
name: codespaces-host-image-operator
description: Analyze, select, change, verify, and roll back GitHub Codespaces Stable/Beta VM host-image preference while keeping host-image behavior separate from the dev-container image. Use for Codespaces host image compatibility, beta readiness, kernel-coupled dependencies, account preference changes, and host-image rollback.
---

# Codespaces Host Image Operator

Use for GitHub Codespaces VM host-image work.

## Core distinction

Never conflate these layers:

1. **VM host image** — GitHub-managed image for the virtual machine that runs the codespace.
2. **Dev-container image** — container environment defined by the repository/user devcontainer configuration.

Changing Stable/Beta host-image preference does not replace the repository's dev-container image.

## Scope model

The Stable/Beta preference is an account-level GitHub Codespaces setting. Treat it as external account state, not repository configuration.

A repository may contain evidence and compatibility mitigations such as `.devcontainer/devcontainer.json`, Dockerfiles, features, scripts and documentation, but committing such files does not itself change the account-level host-image preference.

## Decision workflow

### 1. Discover

Collect:

- exact GitHub account context when available;
- target repository and Codespaces configuration;
- current Stable/Beta preference when directly observable;
- current host-image release information from `github/codespaces-host-images` when version details matter;
- current `.devcontainer` configuration and related Docker/build scripts.

Unknown values remain `unknown`.

### 2. Compatibility scan

Inspect the repository for host-coupled assumptions, including:

- kernel modules or explicit kernel version checks;
- privileged containers and device passthrough;
- nested virtualization/KVM assumptions;
- low-level networking, iptables/nftables or eBPF dependencies;
- filesystem/mount behavior coupled to the host kernel;
- Docker-in-Docker or sibling-container behavior that depends on host features;
- GPU/device assumptions;
- scripts that inspect `/proc`, `/sys`, uname, cgroups or host-specific paths.

Classify risk as `LOW`, `MEDIUM`, `HIGH`, or `UNKNOWN` and attach evidence paths.

### 3. Choose

Use this default policy unless the user explicitly requests another mode:

- `STABLE`: reliability-sensitive, production-adjacent, CI-parity or unknown/high host-coupling risk.
- `BETA`: explicit early-access testing, compatibility validation, or required host feature with acceptable recovery path.

Do not claim Beta is active merely because the preference is Beta. GitHub may use Stable when no Beta image is available.

### 4. Change preference

Prefer a structured GitHub account-setting capability if one exists and is verified for this exact setting. Otherwise use authenticated browser automation against GitHub Settings → Codespaces.

Before a browser write:

- confirm the browser profile is signed into GitHub;
- re-read the current preference;
- verify the account/tenant identity if visible;
- mutate only the Stable/Beta preference;
- do not change unrelated Codespaces settings.

After changing the setting, re-read the preference in the same account context.

### 5. Effective-state verification

The preference affects codespaces created or resumed after the change. Do not claim an already-running codespace moved to a different host image without direct evidence.

When validating effective behavior:

- create/resume only through an explicitly authorized Codespaces capability;
- inspect resulting environment evidence when available;
- if Beta is unavailable and GitHub falls back to Stable, report `BETA_PREFERENCE_STABLE_EFFECTIVE` rather than success as Beta.

### 6. Recovery

If a Beta-hosted/resumed codespace exhibits a compatibility regression attributable to the host layer:

1. capture the failing evidence;
2. change the account preference back to Stable;
3. re-read the preference;
4. recreate/resume as required by GitHub semantics;
5. verify the issue no longer reproduces before marking recovery successful.

Do not rewrite `.devcontainer` merely to hide a host-image regression unless the repository change is independently justified and accepted.

## Result states

Use one of:

- `STABLE_VERIFIED`
- `BETA_PREFERENCE_VERIFIED`
- `BETA_PREFERENCE_STABLE_EFFECTIVE`
- `COMPATIBILITY_RISK`
- `AUTH_REQUIRED`
- `TOOL_UNAVAILABLE`
- `BLOCKED_UNVERIFIED`
- `FAILED_RECOVERED`

Use `references/host-image-policy.md` for the decision and evidence schema.
