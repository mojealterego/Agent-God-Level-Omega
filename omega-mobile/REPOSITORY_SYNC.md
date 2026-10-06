# OMEGA Mobile Engineering

Repository snapshot of the Android-first OMEGA Mobile Engineering plugin.

- Version: 4.3.3
- Release: pluginrel_6ac54c17e32881919d5f4291826bd3cc
- Remote backend: Cloud Run-ready Streamable HTTP MCP
- Auth: OAuth resource server with RFC 9728 metadata and JWT/JWKS or RFC 7662 verification
- Cloud: Google Cloud organization/folder/project automation, WIF, Artifact Registry and Cloud Run
- Clients: ChatGPT and Gemini share the same HTTPS /mcp endpoint
- Local lane: Termux Secure MCP remains available

The existing `omega/` tree is intentionally preserved. This `omega-mobile/` tree tracks the mobile/cloud distribution without overwriting the newer cumulative OMEGA core.
