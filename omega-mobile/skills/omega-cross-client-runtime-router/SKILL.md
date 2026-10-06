---
name: omega-cross-client-runtime-router
description: Use when OMEGA must choose between the shared Remote MCP gateway, ChatGPT connected cloud services, Gemini custom-app execution, and the preserved Termux Secure MCP lane for the same product task.
---

# OMEGA Cross-Client Runtime Router

## Mission

Select the strongest real execution path for each operation without assuming that ChatGPT, Gemini, Cloud Run, or Termux exposes identical capabilities.

## Runtime lanes

```text
Remote MCP / Cloud Run  shared standards-based backend for ChatGPT + Gemini
ChatGPT connectors      provider-native GitHub/GitLab/OpenAI/etc. when exposed
Gemini custom app       shared Remote MCP URL when Gemini account supports it
Termux Secure MCP       OpenAI tunnel to the phone-local stdio control plane
```

## Routing law

Prefer the provider that owns the target state. Use repository connectors for remote source/CI state, Google/IBM/Unity/Play provider automation for cloud state, the Remote MCP gateway for shared cross-client tools, and Termux only for device-local execution or when its observed capability is stronger.

Never make a Gemini product task depend on the OpenAI Secure MCP Tunnel because that tunnel is an OpenAI transport. Never remove the tunnel merely because a remote gateway exists.

## Handoff

When work moves between clients or runtimes, carry immutable identifiers rather than conversational assumptions: repository + revision, build/run ID, artifact digest, Cloud Run revision, Play version code, Unity build number, and verified endpoint URL.

## Completion

A cross-client task is complete only when the final product state is verified by its authoritative provider. Model agreement or successful routing alone is not completion.
