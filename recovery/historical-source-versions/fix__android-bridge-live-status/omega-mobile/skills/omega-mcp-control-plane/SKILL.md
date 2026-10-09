---
name: omega-mcp-control-plane
description: Use when the dedicated OMEGA MCP server is exposed or when engineering work needs one governed control plane for terminal execution, repositories, CI, containers, builds, sandboxes, Android devices/emulators, verification, and artifact evidence.
---

# OMEGA MCP Control Plane

## Purpose

OMEGA MCP is the physical execution substrate for OMEGA v3. It does not replace the host's native tools and it does not create permissions. It unifies engineering execution behind one capability registry, one policy kernel, bounded process execution, secret redaction, path confinement, evidence hashes, and deterministic adapters.

## Detection rule

Never assume OMEGA MCP exists because this skill exists.

Treat it as available only when the host exposes its tools, beginning with:

```text
omega_capabilities
```

If that tool is unavailable, fall back to the ordinary capability discovery router and use the strongest real host-native connector/API/CLI.

## Control-plane tool surface

When available, route matching work through:

```text
omega_capabilities
omega_host_info
omega_terminal_run
omega_repository_inspect
omega_sandbox_create
omega_ci
omega_container_run
omega_build_run
omega_verify
omega_device
omega_artifact_inspect
```

## Routing policy

Prefer OMEGA MCP when it provides the same required capability with equal or stronger:
- workspace confinement;
- structured output;
- auditability;
- evidence generation;
- reversibility;
- secret discipline;
- branch safety.

Prefer an authoritative native provider instead when it has materially stronger semantics, such as a repository-host API for permissioned metadata, a deployment platform's native rollback primitive, or a signed artifact registry.

## Execution classes

OMEGA uses the common side-effect classes:

- `R` — observation/read;
- `L` — local reversible mutation;
- `E` — external reversible mutation;
- `H` — high-impact mutation.

Do not deliberately under-classify an operation. The MCP policy kernel may raise the effective class based on the argv and reject execution even when the caller declares a lower class.

## Secure defaults

The control plane is intentionally restrictive:
- all paths must stay inside configured workspace roots;
- no `shell=true` execution;
- shell interpreters are disabled unless explicitly enabled;
- general terminal execution is restricted by default;
- project code execution is separately gated;
- external mutations are separately gated;
- high-impact operations are separately gated;
- command output is bounded;
- secret-looking argv and output values are redacted;
- containers have network disabled and a read-only workspace mount by default;
- device mutation requires explicit Android serial targeting.

A denial is an observed policy fact, not a reason to fabricate execution. Use another authorized execution path only if it preserves the acceptance criteria and security invariants.

## Repository and sandbox invariant

For isolated work, use `omega_sandbox_create` when available. It creates a detached Git worktree and verifies that the source branch and HEAD did not change.

The existence of a sandbox never authorizes changing the repository's default branch.

## CI

Use `omega_ci` for GitHub/GitLab run discovery and inspection. Triggering CI is an external mutation and must satisfy the external-action gate.

After triggering, observe the exact run and revision. Do not infer remote success from a local result.

## Builds and verification

Use `omega_build_run` for one bounded project execution and `omega_verify` for an ordered gate suite.

A verification suite must contain the real project-native commands discovered from repository state. Never invent a generic test command merely because the MCP tool exists.

## Android / Termux

When host identity affects routing, call `omega_host_info` first. If it reports `termux: true`, treat the phone as the execution host and prefer the Secure MCP Tunnel-backed runtime described by `omega-android-termux-runtime`. Tunnel health proves connectivity only, not task completion.

Use `omega_device` to list devices before mutation. Any shell/install action must target a concrete serial. Use emulator actions only when the environment actually contains the Android emulator binary and the requested verification requires it.

## Artifacts

Use `omega_artifact_inspect` to independently verify a produced artifact's canonical path, non-zero size, extension, modified timestamp, and SHA-256. Add platform-specific signing/package validation when the relevant verifier exists.

## Completion

OMEGA MCP evidence can satisfy a completion predicate only when the returned observation directly proves that predicate. A successful tool invocation is not by itself proof that the requested software behavior is correct.
