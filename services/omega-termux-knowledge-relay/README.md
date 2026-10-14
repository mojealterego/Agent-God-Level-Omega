# OMEGA Termux Knowledge Relay

Private HTTPS MCP relay and Android WebSocket agent. Knowledge tools remain read-only.
The remote terminal requires local consent. Read-only operations support a revocable
persistent grant without expiry; local modifications require separate timed consent. Prefer the official OpenAI Secure MCP Tunnel
for broad engineering access.

## Architecture

```text
ChatGPT private MCP connector -> authenticated Render /mcp
     -> authenticated WebSocket agent -> Termux on Android
        |-> BAZA WIEDZY read-only
        |-> allowlisted argv execution (opt-in, bounded, no shell)
```

## MCP tools

Knowledge (read-only): `omega_knowledge_info`, `omega_knowledge_list`,
`omega_knowledge_metadata`, `omega_knowledge_read`, `omega_knowledge_search`.

Terminal (requires both updated server and updated phone agent):
- `omega_terminal_status` — checks whether the phone agent is armed.
- `omega_terminal_run` — invokes one allowlisted command with `argv`, relative
  `cwd`, `sideEffect` `R` (read-only) or `L` (local change), bounded
  `timeoutMs`, and bounded `maxOutputBytes`.

The terminal runner refuses shell interpreters, non-allowlisted binaries,
network-changing Git operations, absolute command paths, credential paths and
working directories outside `OMEGA_RELAY_WORKSPACE_ROOT` (default: Termux HOME).

## Update the Termux agent

On the Android phone, download the latest `phone-client.mjs`,
`phone-terminal.mjs`, `phone-terminal-consent.mjs` and the existing
`phone-knowledge-root.mjs` from this directory and
`omega-mobile/mcp/omega-control-plane/src/knowledge/phone-knowledge-root.mjs`
respectively. The existing authenticated `/bootstrap` installer downloads
all these files on fresh setup. Restart the phone client so its new
`terminal.*` dispatch becomes available. Do not expose bootstrap or bearer
tokens through chat, command history, screenshots, or repositories.

For **persistent read-only access without expiry**, run this once on the phone:

```bash
bash "$HOME/omega-relay-upgrade.sh" --permanent-readonly
```

This enables only read-classified commands. Local modifications still require separate authorization. Revoke either grant with `disable` below.

Grant a ten-minute local execution window *on the Android device*:

```bash
node "$HOME/.local/share/omega-knowledge-relay/phone-terminal-consent.mjs" arm 10
```

Revoke before expiry with:

```bash
node "$HOME/.local/share/omega-knowledge-relay/phone-terminal-consent.mjs" disable
```

Timed write-consent lasts 1–15 minutes and is OFF by default. Read-only consent may instead be granted persistently once on the phone. The local grant is stored
under `~/.config/omega/relay_terminal_grant.json` with restrictive permissions.
Never expose the grant to ChatGPT as a secret or remotely extend it.

## Server deployment

Render service `omega-termux-knowledge-relay` uses `main` and has auto-deploy
disabled; merge/write code does not prove the deployed service is updated.
A verified Render deployment, paired phone update, live capability check
and a real successful `omega_terminal_run` are needed before claiming
end-to-end functionality.

Hosting secrets must remain in Render environment variables:
`OMEGA_RELAY_PLUGIN_TOKEN`, `OMEGA_RELAY_AGENT_TOKEN`,
`OMEGA_RELAY_BOOTSTRAP_TOKEN`, `OMEGA_PAIR_CODE`.
Do not commit bearer tokens to Git or portable plugin source. Rotate legacy
credentials stored in old plugin archives before enabling long-lived remote
terminal use. The official OAuth-protected Secure MCP Tunnel is preferred.
