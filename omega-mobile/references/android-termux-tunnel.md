# Android / Termux Secure MCP Tunnel

## Topology

```text
ChatGPT Android
    |
    | OpenAI connector runtime
    v
OpenAI Secure MCP Tunnel
    ^
    | outbound HTTPS long-poll only
    |
tunnel-client in Termux
    |
    | stdio
    v
OMEGA MCP control plane
    |
    +-- terminal / Git / builds / verification
    +-- GitHub/GitLab CLI when installed
    +-- ADB when android-tools is available
    +-- local artifacts and repositories under configured workspace roots
```

## Invariants

1. Never publish a Termux MCP listener directly to the Internet for this workflow.
2. Never place runtime/admin API keys in `plugin.json`, `mcp.json`, Git, shell history, logs, or MCP output.
3. Use a runtime key with Tunnel Read + Use; do not use an admin key for the long-lived runtime.
4. Keep `OMEGA_WORKSPACE_ROOTS` narrow enough for the task. The packaged Termux default is `$HOME`.
5. `omega_host_info` must be used when host identity affects tool choice.
6. A successful tunnel connection is not completion evidence; verify the requested repository/build/artifact independently.
7. On Android, containers and emulators may be unavailable. Capability discovery decides; do not emulate their presence.

## Mobile routing

When `omega_host_info.termux=true`, prefer local Termux capabilities for repository, build and artifact operations. Prefer platform-native connectors for operations that have stronger remote semantics. Use `omega_device` only when ADB is actually discoverable.
