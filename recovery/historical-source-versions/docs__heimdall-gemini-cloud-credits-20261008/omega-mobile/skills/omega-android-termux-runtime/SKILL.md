---
name: omega-android-termux-runtime
description: Use when OMEGA engineering work is executed from ChatGPT on Android through a Termux-hosted MCP control plane, including Secure MCP Tunnel setup, host detection, repository/build routing, Android tooling, health verification, and mobile-safe security gates.
---

# OMEGA Android / Termux Runtime

## Activation

Use this skill when the user wants OMEGA to operate from Android/Termux or when `omega_host_info` reports `termux: true`.

Do not infer that Termux is connected merely because this skill is installed. The execution path is live only when the OMEGA tools are exposed and `omega_capabilities` reports real capabilities.

## Required topology

Prefer OpenAI Secure MCP Tunnel for ChatGPT Android:

```text
ChatGPT Android -> Tunnel connector -> OpenAI Secure MCP Tunnel -> tunnel-client in Termux -> OMEGA MCP stdio server
```

This is outbound-only from the device. Do not replace it with a public unauthenticated Termux listener.

## First observations

When tools are reachable:
1. call `omega_host_info`;
2. call `omega_capabilities`;
3. inspect the exact repository before mutation;
4. keep operations within the configured workspace roots;
5. route only to capabilities reported available.

## Termux capability expectations

Typical available capabilities may include Node.js, Git, GitHub CLI, Java/Gradle, Python, Rust/Go, and ADB. Docker/Podman and the Android emulator are not assumed on Android. Their absence is a normal capability result, not a failure to fabricate around.

## Security gates

The packaged Termux wrapper enables project execution but leaves unrestricted terminal, external mutation, high-impact actions and shell interpreters disabled by default.

Do not weaken a gate globally to solve one command. Prefer a dedicated OMEGA tool first. If a task truly requires an external or high-impact operation, require the corresponding authorization and preserve evidence.

## Secure tunnel lifecycle

Use the native tunnel runtime lifecycle where operator execution is available:

```text
omega-termux configure
omega-termux connect
omega-termux status
```

The runtime key must stay local to the device. Never ask the user to paste the key into chat.

Treat the runtime as connected only when status proves the process is running and health/readiness are surfaced. If the runtime is offline, report the tunnel as unavailable rather than claiming tool execution.

## Android routing

For code changes and builds, use the Termux filesystem/repository as the execution authority when that is where the user's project lives. For remote repository metadata, CI, releases or deployments, prefer the provider-native connector when it offers stronger permissions, provenance or rollback semantics.

Use ADB only when `device.android` is available. Any mutating device operation must target an explicit serial.

## Completion

A mobile session is complete only when the requested code/build/artifact result has direct evidence. Tunnel health proves connectivity only; it does not prove the software task succeeded.
