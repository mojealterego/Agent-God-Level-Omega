---
name: omega-lovable-app-engineer
description: Engineers and verifies Lovable applications with explicit security, secret, browser-test, edge-function, database, version-history, design-system and MCP boundaries derived from the supplied Lovable documentation.
---
# OMEGA Lovable App Engineer

Use this skill when work targets a Lovable project, its built-in backend, security surface, version history, design system, or official Lovable MCP server.

## Security-first workflow

Treat Basic and Deep security scans as evidence sources, not guarantees. Before a production release, resolve current critical findings or return a blocked state. Review row-level security, schema/access combinations, dependency findings, authentication/authorization boundaries, backend endpoint protection, unsafe input handling and information leakage when relevant.

Never place API keys or private credentials in browser code. Backend credentials belong in the provider secret store and are consumed by server-side or Edge Function code. Values prefixed with `VITE_` are browser-exposed build-time configuration and must never be represented as private secrets. Do not print or persist secret values in OMEGA evidence.

## Verification router

Choose the smallest proof surface:
- real browser/user-flow problem → browser test with UI, console and network evidence;
- isolated UI rule/regression → frontend test;
- backend behavior → direct Edge Function call;
- backend rule requiring long-term regression protection → edge test after reproduction and fix.

For a backend bug prefer: reproduce directly → fix → repeat the same direct call → add an edge regression test.

## Version safety

Lovable version history is a code safety net. Reverting code may redeploy matching Edge Functions, but it does **not** roll back database data. Any database mutation or migration needs a separate rollback/migration plan and observed verification. Bookmark or otherwise identify a known-good version before high-risk changes when the provider surface supports it.

## Design systems

Treat `.lovable/design-system.json` as the machine-readable source of truth, with rendered component/token/library rules and hand-authored `system.md`. Validate token adherence, component reuse, dependency wiring, version attachment and setup verification. Do not edit managed copied design-system files when the update model will overwrite them; durable changes belong in the design-system project.

## Lovable MCP boundary

Use the real Lovable MCP connector only when installed and connected. Its repository/project tools can expose project files, diffs, edit history, database operations, connectors and analytics according to current permissions. A connector-add flow may require a Lovable dashboard/UI step; do not claim programmatic connection when the provider only returns a setup URL.

See `references/lovable-platform-source-synthesis.md`.
