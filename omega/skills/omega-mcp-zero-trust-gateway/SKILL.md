---
name: omega-mcp-zero-trust-gateway
description: Use when registering or routing MCP servers and tools. Enforce URL boundaries, tool-name collision checks, secret scanning, explicit allowlists, namespace isolation, version/digest metadata and fail-closed routing.
---

# Zero-trust MCP gateway

## Procedure

1. Inspect the existing OMEGA capability catalog before adding anything new.
2. Reuse an existing capability when semantics and safety boundaries already match.
3. Add a new capability only when it contributes a distinct executable mechanism.
4. Keep discovery metadata concise; load detailed references only when activated.
5. Verify consequential behavior with tests or observed tool output.
6. Never convert an external project claim into an OMEGA capability claim without local or provider evidence.

See `../../references/ecosystem-research-v14.md` for provenance and `../../references/dedup-policy-v14.md` for canonicalization rules.
