# OMEGA on Android / Termux

OMEGA v3.3 can run the local MCP control plane inside Termux and connect it to ChatGPT through OpenAI Secure MCP Tunnel. The phone initiates outbound HTTPS; the MCP server does not need a public inbound port.

## Install

From the unpacked plugin directory in Termux:

```bash
bash termux/install.sh
export PATH="$HOME/.local/bin:$PATH"
```

The installer:
- installs Node.js, Git, curl, unzip, Python, coreutils and Android platform tools when available;
- installs the OMEGA MCP server under `$HOME/.local/share/omega-mcp/control-plane`;
- installs MCP dependencies with lifecycle scripts disabled;
- downloads the pinned official OpenAI `tunnel-client` release for Linux ARM64/AMD64 and verifies its published SHA-256 checksum;
- falls back to building the same release from source if the prebuilt Linux binary is not executable on the local Android/Termux build;
- installs `omega-mcp-stdio` and `omega-termux` into `$HOME/.local/bin`.

## Configure without exposing credentials to chat

Create or obtain an OpenAI Secure MCP Tunnel and a runtime API key in the OpenAI Platform UI. Then configure locally in Termux:

```bash
omega-termux configure
```

The command prompts for `tunnel_id` and the runtime API key. The key is stored only on-device in `$HOME/.config/omega/runtime_api_key` with mode `0600`; it is never written into the plugin package, Git repository, command arguments, or tool output.

## Connect

```bash
omega-termux connect
omega-termux status
```

`connect` uses the native managed runtime flow:

```text
tunnel-client runtimes connect
  -> OpenAI Secure MCP Tunnel
  -> local stdio omega-mcp-stdio
  -> OMEGA MCP control plane in Termux
```

After the runtime is healthy, configure ChatGPT using **Settings → Connectors → Connection: Tunnel** and select/paste the same tunnel id.

## Security defaults

The Termux wrapper sets:
- `OMEGA_WORKSPACE_ROOTS=$HOME`;
- project build/test execution enabled;
- unrestricted terminal disabled;
- external mutation disabled;
- high-impact execution disabled;
- shell interpreter execution disabled.

Raise those gates only for a task that actually requires them.

## Commands

```text
omega-termux configure
omega-termux connect
omega-termux status
omega-termux stop
omega-termux remove
omega-termux config
omega-termux connector
```

Stopping/removing the local runtime does not delete the remote tunnel.
