# OMEGA Termux Knowledge Relay

Private read-only bridge between ChatGPT and the Android folder bound as the
OMEGA knowledge root (default: `Download/BAZA WIEDZY`).

## Architecture

```text
ChatGPT private MCP plugin
        |
        | HTTPS + private bearer token
        v
Render relay /mcp
        |
        | authenticated WebSocket
        v
Termux phone client
        |
        v
Download/BAZA WIEDZY
```

The relay does not store document contents. It forwards bounded read-only
requests to the connected phone and returns the result.

Exposed MCP tools:
- `omega_knowledge_info`
- `omega_knowledge_list`
- `omega_knowledge_metadata`
- `omega_knowledge_read`
- `omega_knowledge_search`

No create/update/delete/move/rename tool is registered.

Secrets are supplied only through hosting environment variables:
- `OMEGA_RELAY_PLUGIN_TOKEN`
- `OMEGA_RELAY_AGENT_TOKEN`
- `OMEGA_RELAY_BOOTSTRAP_TOKEN`

They must never be committed to Git.
