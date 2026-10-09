---
name: plugin-collector-agent
description: Use when the user wants ChatGPT to discover plugins/apps/connectors or MCP servers that are available but not installed, keep collecting them over time, or check for newly listed items.
---

# Plugin Collector Agent

This agent scans two catalogs:

1. **ChatGPT Plugin Directory** — installable apps/plugins/connectors.
2. **GitHub MCP Registry** — community MCP servers published at `https://github.com/mcp?page=1..7`.

## Hard platform boundary

ChatGPT plugin installation and account connection require user action in the host UI. There is no silent-install tool in the current Plugin Management surface.

The GitHub MCP Registry also contains servers that are not directly installable in ChatGPT. An `Install` control in that registry is not proof of ChatGPT mobile compatibility.

Therefore:
- never claim that an app or MCP server was installed until the host reports it installed/connected;
- use `search_plugins` to find a ChatGPT-native/canonical equivalent;
- use `suggest_plugins` only for exact catalog entries returned by ChatGPT Plugin Management;
- never fabricate an app ID, plugin ID, MCP endpoint, auth scheme or installation result.

## Main workflow

1. Scan the ChatGPT Plugin Directory using `references/catalog-scan.md`.
2. Scan GitHub MCP Registry pages 1 through 7 using `references/github-mcp-registry.md`.
3. De-duplicate by exact ChatGPT plugin ID and, for MCP registry entries, by canonical server name/source.
4. For every MCP candidate classify:
   - `remote-hosted` — potentially suitable for Android/web;
   - `local-stdio` — desktop/local-only by default;
   - `hybrid/unknown` — requires server README/detail verification;
   - `auth-required` — hosted but requires OAuth/API key/account setup.
5. Search the ChatGPT Plugin Directory for an exact or canonical equivalent before recommending custom MCP setup.
6. Prefer already-supported ChatGPT apps over wrapping the same provider in a custom/local MCP.
7. For ChatGPT catalog candidates keep entries that are enabled/available and `installed == false`.
8. Suggest at most 10 installable ChatGPT plugins per run.
9. Report remote MCP candidates separately when no native ChatGPT plugin is available.

## Mobile policy

The user's primary device may be Android-only.

Prefer:
1. verified ChatGPT app binding;
2. verified remote/hosted MCP reachable over HTTPS;
3. browser/cloud workflow;
4. local/stdio MCP only as an optional desktop/Termux lane, never as a prerequisite unless the user explicitly asks for it.

Do not equate `remote URL` with mobile support unless the ChatGPT host can actually connect to it.

## Every-three-days mode

When invoked by the scheduled task:
- rescan the ChatGPT plugin catalog;
- rescan all seven GitHub MCP Registry pages;
- identify newly discovered or still-uninstalled ChatGPT plugins;
- identify new remote/hosted MCP candidates that lack a ChatGPT-native equivalent;
- surface up to 10 official plugin installation suggestions;
- summarize MCP-only candidates separately;
- avoid repeated suggestions inside the platform's anti-repeat window when that state is available.

## Evidence

Label separately:
- **Installed** — host confirms installed.
- **Suggested** — installation UI was surfaced, not yet installed.
- **ChatGPT-native candidate** — catalog result exists.
- **MCP candidate** — registry entry exists but ChatGPT connection is not yet verified.
- **Desktop/local-only** — stdio/local runtime or equivalent is required.
