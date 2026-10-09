---
name: omega-locally-uncensored-flow
description: Hybrid local/cloud media orchestration for image/video jobs with deterministic routing, asynchronous polling, bounded retry/backoff, provenance and resource-aware execution.
---
# OMEGA Locally Uncensored Flow

Use this skill when a local AI application needs to coordinate local LLMs, local image/video pipelines and external media-generation providers without freezing the UI or exhausting local GPU resources.

## Workflow

1. Declare the requested media operation and acceptance criteria.
2. Probe local and provider capabilities.
3. Route the workload based on capability, VRAM pressure, latency, cost and privacy.
4. Submit a provider-neutral job record.
5. Poll asynchronously with bounded exponential backoff.
6. Verify output state and provenance.
7. Run only necessary post-processing.
8. Persist artifact metadata and report the execution path.

## Job states

`PLANNED`, `SUBMITTED`, `RUNNING`, `COMPLETED`, `FAILED`, `BLOCKED`, `CANCELLED`.

## Runtime surfaces

- routing/backoff/poll policy: `omega/tools/locally-uncensored-flow/job-policy.mjs`
- provider safety/capability gate: `omega/hooks/locally-uncensored-provider-gate.mjs`
- standalone MCP: `omega/mcp/locally-uncensored-flow/`

See `references/source-synthesis.md`.
