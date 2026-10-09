# TinyFish provider contract — source review, 2026-10-09

## Verified public documentation

- Quick Start: https://docs.tinyfish.ai/quick-start — TinyFish Python SDK (`tinyfish`), TypeScript SDK (`@tiny-fish/sdk`), CLI and raw HTTP with `X-API-Key`.
- Agent API Reference: https://docs.tinyfish.ai/agent-api/reference — `POST https://agent.tinyfish.ai/v1/automation/run`, `POST .../run-async`, `POST .../run-sse`, `GET https://agent.tinyfish.ai/v1/runs/{id}`, `POST .../v1/runs/{id}/cancel`.
- MCP Integration: https://docs.tinyfish.ai/mcp-integration — official remote MCP `https://agent.tinyfish.ai/mcp`; special ChatGPT custom URL `https://agent.tinyfish.ai/mcp/chatgpt` with OAuth. Documented tools include automation, async status/cancel, search, fetch, sessions and wallet.
- Structured Output: https://docs.tinyfish.ai/key-concepts/structured-output — top-level `output_schema.type` is `object`; not all JSON Schema keywords are supported.

## Implemented local mapping

| OMEGA local tool | Provider call | Mutates / charged? |
|---|---|---|
| `omega_tinyfish_preflight` | none | no |
| `omega_tinyfish_start_async` | `POST /v1/automation/run-async` | browser run; can incur charges and change site state |
| `omega_tinyfish_get_run` | `GET /v1/runs/{id}` | provider read |
| `omega_tinyfish_cancel_run` | `POST /v1/runs/{id}/cancel` | provider run state change |

The local adapter deliberately does **not** implement Search/Fetch/Browser/Wallet or hosted OAuth because the official TinyFish MCP already supplies these surfaces. It does **not** expose the Vault. No provider activity is claimed as tested by local unit tests.

## Safety checks

An allowlisted URL must use HTTPS without URL credentials, fragment or non-default explicit port; obvious private IP targets and localhost names are rejected; hostname must be explicitly allowlisted. Run and write environment gates default to off. `approved` is a caller assertion and is not equivalent to provider-side identity binding. Full DNS resolution, redirect navigation, model instruction compliance and read-only site safety cannot be guaranteed by a lexical preflight.
