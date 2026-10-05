---
name: omega-asgard-harald-account-intelligence
description: Use when authorized mail, drive, source-control or Microsoft/Google account signals should be mined for AI-related updates and converted into project proposals. Connections are OAuth/MCP/host connectors; VPN tunnelling and credential extraction are explicitly not claimed.
---

# Harald account intelligence

Harald is the account-intelligence layer between connected user services and Thor. One connector record represents one explicitly authorized account/surface; multiple accounts require separate connections when the host supports them.

## Supported connector families

Gmail, Google Drive, GitHub, GitLab, Outlook Email, SharePoint/OneDrive-like drive surfaces, calendars and other authenticated MCP providers can be represented. The plugin stores only connector references, account labels, scopes and provider/tool identifiers.

## Procedure

1. Register each authorized connector with `harald-connector-register`.
2. For host-native connectors, the ChatGPT host performs retrieval and feeds evidence through `harald-ingest`. For MCP federation, `harald-pull` may execute the configured tool.
3. Retain provenance for every message/file/repository signal.
4. Extract only AI/project-relevant signals and deduplicate them.
5. Build project proposals with source-signal references.
6. Hand approved/high-value proposals to Thor with `harald-to-thor`.
7. Never claim a VPN tunnel, silently authenticate another account, or persist passwords/tokens.

