---
name: omega-omni-model-scout
description: Evidence-first model-release discovery and candidate ranking across public model hubs, repositories and vendor sources, with separate approval gates for download and runtime mounting.
---
# OMEGA Omni Model Scout

Use this skill when OMEGA must discover newly released LLM/model artifacts, compare candidates and prepare a safe acquisition plan.

## Workflow

`scope → discover → normalize → deduplicate → verify-source → review-license → integrity-plan → compatibility → rank → approve → acquire → mount`.

Discovery may use public model hubs, repositories, vendor release pages and other lawful public sources. Do not claim exhaustive coverage of the internet.

## Acquisition boundary

- discovery is read-only;
- download requires explicit approval, source verification, license review, compatibility check and sufficient storage;
- mounting requires a locally verified artifact and declared runtime target;
- never execute arbitrary installer/post-install code embedded in a model source.

## Runtime surfaces

- deterministic ranking: `omega/tools/omni-model-scout/model-candidate.mjs`
- acquisition/mount gate: `omega/hooks/omni-model-scout-gate.mjs`
- standalone MCP: `omega/mcp/omni-model-scout/`

See `references/source-synthesis.md`.
