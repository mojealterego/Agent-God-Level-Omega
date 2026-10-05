---
name: omega-remote-mcp-federation
description: Use when OMEGA must connect to one or more real remote MCP servers, authenticate from environment-backed credentials, discover tools, health-check providers, persist non-secret configuration, route calls by capability and recover from transport failures.
---

# Remote MCP Federation v6

Use `omega_mcp_federation`; never invent remote capability.

## Registration

Register:
- stable `id`;
- HTTPS `endpoint` (localhost HTTP is allowed for development);
- priority;
- capability labels;
- optional non-secret headers;
- `headerEnv` mappings;
- optional environment-backed `auth`.

Supported auth contracts:

```json
{"type":"bearer-env","env":"TOKEN_ENV_NAME"}
```

```json
{
  "type":"client-credentials-env",
  "clientIdEnv":"CLIENT_ID_ENV",
  "clientSecretEnv":"CLIENT_SECRET_ENV",
  "expectedIssuer":"https://issuer.example"
}
```

Do not place bearer tokens, API keys, client secrets or credentials in persistent headers.

## Live sequence

1. `register`
2. `health` — proves transport/tool discovery now
3. `tools` — inspect actual names/schemas
4. `call` or capability-routed `invoke`
5. `export` — inspect persisted non-secret configuration when needed

A registration is configuration, not proof of connectivity.

## Reliability

OMEGA records failure count and observed latency. Repeated failures open a circuit. After cooldown the provider may be probed again. Failed connections are discarded before retry so stale sessions are not silently reused.

## Security

Never bypass the host's authorization flow. Environment variable names may be persisted; their values must not be.
