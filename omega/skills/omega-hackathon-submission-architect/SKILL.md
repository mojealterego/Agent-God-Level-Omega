---
name: omega-hackathon-submission-architect
description: Evidence-first hackathon rules, eligibility, fresh-code provenance, deadline conflict resolution, prototype readiness and submission-artifact compliance.
---
# OMEGA Hackathon Submission Architect

Use this skill for Devpost and other hackathon submissions where rules, build windows, team eligibility, pre-existing assets and submission artifacts must be auditable.

## Workflow

1. Capture authoritative rules and timestamps.
2. Resolve eligibility constraints.
3. Define the official build window.
4. Inventory all pre-existing code/assets.
5. Record event-created commits/assets in a fresh-code ledger.
6. Verify a functional prototype exists.
7. Audit required submission artifacts.
8. Apply the deadline and final readiness gates.

## Rule precedence

Official event rules outrank summaries and secondary commentary. When two official timestamps conflict, use the earlier timestamp as the operational deadline until the organizer clarifies the conflict.

## Runtime surfaces

- deterministic audit: `omega/tools/hackathon-submission/submission-audit.mjs`
- final gate: `omega/hooks/hackathon-submission-gate.mjs`
- standalone MCP: `omega/mcp/hackathon-submission-architect/`

See `references/source-synthesis.md`.
