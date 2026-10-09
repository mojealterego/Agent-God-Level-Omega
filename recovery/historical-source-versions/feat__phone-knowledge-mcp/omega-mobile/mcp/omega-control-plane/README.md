# OMEGA MCP Control Plane v4.3

The control plane now supports both transports from the same tool implementation:

```text
stdio              -> termux/omega-mcp-stdio -> OpenAI Secure MCP Tunnel
Streamable HTTP    -> src/http-server.mjs -> Cloud Run -> ChatGPT / Gemini custom MCP
```

## Local stdio

```bash
npm install
npm run start:stdio
```

## Remote HTTP development

Local unauthenticated mode is intentionally gated:

```bash
NODE_ENV=test OMEGA_AUTH_MODE=none PORT=8080 npm start
```

Production must use OAuth:

```text
OMEGA_AUTH_MODE=jwt
OMEGA_OAUTH_ISSUER=https://issuer.example/
OMEGA_OAUTH_AUDIENCE=https://omega.example/mcp
OMEGA_OAUTH_SCOPES=omega.mcp
```

Optional JWT config: `OMEGA_OAUTH_JWKS_URI`.

RFC 7662 introspection mode uses:

```text
OMEGA_AUTH_MODE=introspection
OMEGA_OAUTH_INTROSPECTION_URL=...
OMEGA_OAUTH_INTROSPECTION_CLIENT_ID=...
OMEGA_OAUTH_INTROSPECTION_CLIENT_SECRET=...
```

Keep introspection credentials in the runtime secret store.

## HTTP surface

- `GET /healthz`
- `GET /readyz`
- `GET /.well-known/oauth-protected-resource`
- `GET /.well-known/oauth-protected-resource/mcp`
- `POST/GET /mcp` through the MCP HTTP handler

The `/mcp` route is protected in production. Health and protected-resource metadata are public by design.


## Read-only phone knowledge tools

When `OMEGA_KNOWLEDGE_ROOT` is set, the same stdio control plane exposes:

- `omega_knowledge_info`
- `omega_knowledge_list`
- `omega_knowledge_read`
- `omega_knowledge_search`

On Termux the wrapper defaults this to `$HOME/storage/shared/OMEGA-KNOWLEDGE`. This root is intentionally separate from normal workspace roots. Supported text files are read directly; PDFs are converted locally with `pdftotext`. Reads and searches are bounded by byte/file/result limits and reject traversal outside the configured root.
