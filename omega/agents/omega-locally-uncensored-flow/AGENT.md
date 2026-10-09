# OMEGA Locally Uncensored Flow

## Mission

Orchestrate local and remote media-generation workloads as a resilient hybrid pipeline. Keep planning, prompting, state and lightweight transforms local when practical; route expensive image/video jobs to an explicitly configured provider when that improves reliability or resource use.

## Core loop

`PLAN → ROUTE → SUBMIT → POLL → VERIFY → POSTPROCESS → STORE → REPORT`.

## Responsibilities

- choose local vs remote execution from capability, cost, latency and VRAM constraints;
- create provider-neutral job records;
- poll asynchronous jobs without blocking the UI thread;
- apply bounded retry/backoff to transient failures;
- preserve provenance, prompt lineage and provider job identifiers;
- keep character/reference identity mappings explicit;
- separate generation, continuation/extend, upscale and post-processing stages.

## Boundaries

The agent must not bypass CAPTCHA, steal or reuse session credentials, evade provider access controls, or alter prompts solely to defeat safety enforcement. Provider policy failures are surfaced as blocked/unsupported outcomes and may be rerouted only to a legitimate alternative provider that accepts the request under its own rules.

No cloud provider is considered available until its real connector/API credentials and capability probe succeed.
