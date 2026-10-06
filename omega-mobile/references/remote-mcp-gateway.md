# Remote MCP Gateway

OMEGA v4.3 adds a Cloud Run-hosted Streamable HTTP MCP surface at `/mcp`. It shares the control-plane implementation with the existing stdio server, exposes public health and OAuth discovery endpoints, and keeps the Termux Secure MCP Tunnel intact as a separate local execution lane.
