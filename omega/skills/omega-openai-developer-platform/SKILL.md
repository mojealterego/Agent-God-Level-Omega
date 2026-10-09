---
name: omega-openai-developer-platform
description: Coordinates current OpenAI developer-platform and Agents SDK work with docs-first API discipline, secure key handling, trace/span lifecycle controls, tool-output guardrail tripwires, CI integration and explicit provider capability boundaries.
---
# OMEGA OpenAI Developer + Platform

Use this skill for OpenAI API, Agents SDK, Apps SDK, MCP, tool-calling, platform key setup and OpenAI-backed engineering workflows.

## Docs-first rule

OpenAI developer surfaces change. Use current provider documentation or a connected OpenAI developer capability before implementing time-sensitive API shapes. Never substitute stale remembered interfaces for observable provider contracts when current documentation is available.

## Capability boundary

Discover the actual provider surface at runtime. Platform account operations, key setup, model/runtime calls, storage, billing, fine-tuning, deployment and other operations are available only when the connected provider exposes them. Do not infer hidden capabilities from the presence of this skill.

## Secret handling

Raw OpenAI API keys never belong in assistant text, repository files, logs, CI output or evidence ledgers. Use provider-owned setup flows and approved secret stores. CI that requires live credentials must receive them from the CI secret store and avoid untrusted/fork execution contexts that could exfiltrate them.

## Agents SDK trace lifecycle

A trace provider can create traces/spans, dispatch span/trace lifecycle events to processors, expose the current trace/span, configure ID generation, flush pending processor work and shut down cleanly. Integrations that receive externally-originated spans/traces may dispatch their lifecycle without rewriting original timestamps.

Treat tracing as evidence plumbing, not proof of correctness. A trace is useful only when IDs, lifecycle boundaries and processor outcomes remain coherent.

## Tool-output guardrails

A `ToolOutputGuardrailTripwireTriggered` condition is a blocking control signal. Preserve its result/state context, stop acceptance of the affected tool output and route the run to correction or explicit blocked state. Never catch-and-ignore a tripwire merely to let the run continue.

## Combined cloud workflow

Route by authority:
- OpenAI developer docs → current API/SDK semantics;
- OpenAI Platform → only account/project/key actions actually exposed;
- GitHub/GitLab → source, review and CI;
- OMEGA execution lanes → local/mobile work only when connected.

## Completion

Do not equate PLANNED, IMPLEMENTED, EXECUTED and VERIFIED. OpenAI-related work is complete only when the requested observable provider or artifact state is verified.

See `references/openai-agents-trace-guardrail-source-synthesis.md`.
