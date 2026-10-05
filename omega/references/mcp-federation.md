# Remote MCP Federation v6

OMEGA uses the MCP v2 TypeScript client surface and Streamable HTTP transport for remote providers.

Features:
- persistent provider registry;
- HTTPS enforcement except localhost development;
- bearer token from environment;
- OAuth client credentials from environment;
- tool discovery;
- live provider health;
- observed latency;
- circuit breaking;
- reconnect after failure;
- capability/priority routing;
- non-secret config export.

Imandra CodeLogician preset:

```text
https://api.imandra.ai/v1beta1/tools/mcp/code_logician
```

Official references:
- https://ts.sdk.modelcontextprotocol.io/v2/clients/connect
- https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions
- https://docs.imandra.ai/universe/code_logician/
