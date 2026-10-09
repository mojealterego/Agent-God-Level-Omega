---
name: omega-osint-seeker
description: Lawful evidence-first OSINT and incident-support capability for public sources, user-owned or consented assets, metadata correlation, timelines, confidence scoring and chain-of-custody without covert tracking or account intrusion.
---
# OMEGA OSINT Seeker

Use this skill for public-source investigations, evidence correlation, incident support, missing-asset analysis, metadata review and fact-pattern reconstruction.

## Mandatory preflight

Establish:
1. investigation purpose;
2. legal/authorization basis;
3. allowed source classes;
4. PII handling constraints;
5. prohibited actions.

If the task requires covert tracking, unauthorized telecom lookup, session/cookie theft, credential abuse, malware, active interception or access-control bypass, stop and return a blocked result.

## Workflow

`scope → authority → collect → normalize → deduplicate → corroborate → contradict → timeline → score → report`.

## Evidence states

`OBSERVED`, `CORROBORATED`, `CONTRADICTED`, `INFERRED`, `UNKNOWN`, `REDACTED`.

## Runtime surfaces

- deterministic evidence fusion: `omega/tools/osint-seeker/evidence-fusion.mjs`
- scope/authority gate: `omega/hooks/osint-seeker-gate.mjs`
- standalone MCP: `omega/mcp/osint-seeker/`

See `references/source-synthesis.md`.
