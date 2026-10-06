---
name: omega-canonical-agent-sync
description: Use a canonical .agents source and project deterministic generated projections for Claude, Cursor, Codex and future providers, preventing configuration drift and discouraging direct edits of generated provider copies.
---

# Canonical agent sync

Use this skill when OMEGA is preparing, reviewing or releasing agentic software and CI automation. The objective is not to import a third-party GitHub Action blindly; the objective is to preserve the useful engineering invariant inside OMEGA and keep external implementations optional.

## Operating contract

1. Start from observed repository/workflow state and preserve provenance for every finding.
2. Treat third-party actions, MCP servers, skills, generated prompts and agent output as untrusted inputs until the applicable assurance gate passes.
3. Prefer deterministic checks and structured evidence over free-form model confidence.
4. Never convert a planned external adapter into an execution claim. If a binary, connector, model provider or Action is absent, return the unavailable state and the exact missing dependency.
5. Keep secrets outside prompts and persistent state. Use references, scoped environment variables or authorized connector handles.
6. Fail closed for release-critical uncertainty: mutable supply-chain references, missing required checks, capability widening, unresolved protected writes or missing evidence must block or hold promotion.
7. Preserve OMEGA Reality Filter, KRATOS and THOR final release gates. This skill may add constraints but must not weaken those gates.

## Evidence expected

Record the target identifier, source/ref, observed configuration, policy evaluated, findings, decision, timestamps when relevant and immutable hashes for artifacts/evidence. A PASS only means the declared gate passed for the supplied evidence; it is not a universal claim that the system is bug-free or secure.

## Completion

A task is complete only when the requested artifact or policy output exists, the relevant deterministic checks ran, and the result has a reproducible evidence record. Otherwise use BLOCK, HOLD, PARK, UNAVAILABLE or UNVERIFIED as appropriate.
