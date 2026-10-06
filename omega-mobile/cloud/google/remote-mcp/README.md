# OMEGA Remote MCP on Cloud Run

Deploy `mcp/omega-control-plane` as the Cloud Run service. The container serves Streamable HTTP MCP at `/mcp`, OAuth protected-resource metadata, and health/readiness endpoints.

Production uses application-layer OAuth because ChatGPT and Gemini need a standards-based MCP authorization flow. Configure an established OAuth/OIDC authorization server; OMEGA is the resource server only.

Required JWT-mode environment values:

```text
OMEGA_AUTH_MODE=jwt
OMEGA_OAUTH_ISSUER=https://issuer.example/
OMEGA_OAUTH_AUDIENCE=https://your-mcp-host.example/mcp
OMEGA_OAUTH_SCOPES=omega.mcp
```

Optional values include `OMEGA_OAUTH_JWKS_URI`, `OMEGA_PUBLIC_BASE_URL`, `OMEGA_ALLOWED_HOSTS`, and `OMEGA_ALLOWED_ORIGINS`.

The Cloud Run service can be network-reachable while `/mcp` remains OAuth protected. Do not put OAuth client secrets, IBM keys, Google service-account JSON, Play signing keys, or other credentials in the image or repository.

Operational scripts:

- `bootstrap-gcp.sh` — one-time Google Cloud identity/control-plane/WIF bootstrap from an authenticated Cloud Shell session.
- `deploy.sh` — tested Cloud Run deployment after an OAuth issuer is configured.
- `verify-authenticated.sh` — authenticated MCP `tools/list` verification without putting bearer tokens on argv.

See `references/remote-mcp-bootstrap.md` for the exact lifecycle.
