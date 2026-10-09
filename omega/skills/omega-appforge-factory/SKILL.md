---
name: omega-appforge-factory
description: Evidence-backed application opportunity scoring and portfolio generation that converts validated problems into bounded implementation packets for existing OMEGA engineering teams.
---
# OMEGA AppForge Factory

Use this skill to turn validated user or market problems into a ranked application portfolio.

## Workflow

`problem evidence -> target user -> duplicate check -> score -> portfolio -> acceptance criteria -> squad routing -> implementation -> verification`.

Requested portfolio size is a capacity target. If evidence supports fewer concepts, return explicit gaps instead of inventing filler.

## Runtime surfaces

- deterministic opportunity matrix: `omega/tools/appforge-factory/app-matrix.mjs`
- readiness gate: `omega/hooks/appforge-gate.mjs`
- execution is delegated to existing OMEGA engineering and MCP control-plane surfaces.

See `references/source-synthesis.md`.
