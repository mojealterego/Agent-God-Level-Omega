# OMEGA Grant & Business Architect MCP

Standalone stdio projection of the canonical OMEGA Grant & Business Architect runtime.

## Tools

- `grant_business_architect`

Actions:
- `preflight`
- `criteria-matrix`
- `unit-economics`
- `scenario-model`
- `budget-audit`
- `risk-register`
- `cross-consistency`
- `missing-data`
- `final-gate`

The server imports the same runtime used by the main `omega-control-plane`, so policy and calculation semantics do not diverge.

It does not retrieve or invent current grant-programme rules. Current eligibility, deadlines, limits and attachments must arrive as verified evidence from authoritative sources.
