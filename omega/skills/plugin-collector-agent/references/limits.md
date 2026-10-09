# Platform limits

- ChatGPT Plugin Management search is query-based, not a guaranteed exhaustive list-all API.
- `suggest_plugins` accepts at most 10 plugin IDs per call and should be called at most once per turn.
- Installing/connecting a ChatGPT plugin requires user action in the UI.
- GitHub MCP Registry can contain local, stdio, remote, hosted and hybrid servers.
- Registry presence does not prove ChatGPT compatibility.
- A remote MCP endpoint still needs supported host connection/authentication.
- Never create a fake `.app.json` binding or invented app ID for a registry-only server.
