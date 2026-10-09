---
name: figma-mcp-mcp-registry
description: Use when the user wants to work with the Figma MCP MCP Registry server or inspect its connection/capabilities.
---

# Figma MCP

Registry source: https://github.com/mcp/com.figma.mcp/mcp

## Cross-platform rule

This package intentionally contains no `mcp.json`, `.mcp.json`, local `stdio`, Docker, localhost or desktop runtime dependency.

Before any live action:
1. inspect current host tools/apps for an exact connected provider or MCP server;
2. if a native ChatGPT app exists, prefer it;
3. if a verified remote MCP connection exists, use its live `tools/list` as authority;
4. otherwise explain that this companion provides workflow/knowledge only until the server is connected;
5. never fabricate endpoint URLs, app IDs, OAuth scopes, tool names, write permissions or successful actions.

Do not infer that GitHub MCP Registry's Install control means the server is already connected to ChatGPT.
