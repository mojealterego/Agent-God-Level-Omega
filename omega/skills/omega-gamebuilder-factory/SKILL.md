---
name: omega-gamebuilder-factory
description: Game-builder orchestration that converts a game concept into a bounded engine/platform blueprint, module graph, specialist routing plan, performance budget and verification contract.
---
# OMEGA GameBuilder Factory

Use this skill when the user requests an end-to-end game builder or automated game-production scaffold.

It complements the existing OMEGA AAA game specialists. Do not duplicate physics, rendering, audio, networking or QA specialists; route blueprint modules to those agents.

## Workflow

`concept -> engine/platform -> core loop -> module graph -> asset rights -> budgets -> test plan -> route -> build -> verify`.

## Runtime surfaces

- deterministic blueprint builder: `omega/tools/gamebuilder-factory/game-blueprint.mjs`
- build-readiness gate: `omega/hooks/gamebuilder-gate.mjs`
- execution uses existing OMEGA game specialists and MCP control-plane surfaces.

See `references/source-synthesis.md`.
