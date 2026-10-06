---
name: omega-openai-developer-platform
description: Use when OMEGA needs OpenAI developer documentation, OpenAI Platform project or API-key setup, Agents or Apps SDK guidance, or coordinated cloud engineering that combines OpenAI Platform with GitHub, GitLab, and the Termux execution lane.
---

# OMEGA OpenAI Developer + Platform

## Purpose

Bind OMEGA to OpenAI's developer-facing cloud surfaces without pretending that the OpenAI Platform connector is a general-purpose shell or deployment host.

Use the installed OpenAI Developers dependency for current OpenAI developer guidance and the OpenAI Platform connector for the account/project/key operations it actually exposes.

## Docs-first rule

For OpenAI API, Agents SDK, Apps SDK, MCP, tool-calling, authentication, model or platform behavior that may change over time, prefer the OpenAI developer documentation capability before implementation.

Do not rely on stale remembered API shapes when a current OpenAI developer source is available.

## Platform capability rule

Discover the current OpenAI Platform tool surface at runtime. Typical supported account actions may include:

- organization/project selection for key setup;
- secure API-key creation flows;
- encrypted key handoff to a trusted local setup flow.

Do not invent project deployment, model-management, billing, fine-tuning, storage, batch, vector-store or arbitrary shell capabilities unless corresponding tools are actually exposed.

## Key security

Raw OpenAI API keys must never be returned in assistant text, committed to GitHub/GitLab, written into the plugin package, logged, or copied into OMEGA evidence.

Use the Platform-owned setup flow. When a runtime needs a key, store it only in an approved secret destination such as a local protected file or provider secret store, according to the runtime's own setup contract.

## Combined cloud workflow

For OpenAI-backed software projects, route responsibilities by authority:

```text
OpenAI Developers  -> current technical guidance
OpenAI Platform    -> account/project/key operations actually exposed
GitHub/GitLab      -> repositories, code review, CI/CD and cloud artifacts
OMEGA Termux MCP   -> local builds, device/emulator work, local shell and artifacts
```

The orchestrator may combine these lanes in one task, but each claim must retain provider-specific evidence.

## CI integration

CI may verify code that uses OpenAI APIs without exposing credentials. Tests that require a live OpenAI API key must use the CI provider's secret store and should be isolated from ordinary pull-request execution when fork or untrusted-code exposure is possible.

Never print environment variables or secret-bearing request headers during diagnostics.

## Completion

OpenAI-related setup is complete only when the requested observable state is verified: project/key setup flow completed, docs-backed implementation built, provider CI green, or the requested application artifact produced. A documentation lookup by itself is not implementation completion.
