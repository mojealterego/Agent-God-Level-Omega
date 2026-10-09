# Repository Status

- Canonical cumulative source: `omega/` (OMEGA v24)
- Historical lineage: `history/` (v0→v24)
- Default branch: `main`
- Current feature layer: ElevenLabs Media/Voice Plane
- Embedded MCP: 405/405 PASS
- Standalone MCP: 405/405 PASS
- Plugin validator: PASS
- Skills: 166
- References: 82
- Schemas: 109
- Plugin release: `pluginrel_6ac4b563a9788191b566e9f52d216f74`
- Provider-backed media execution remains conditional on actual authentication, plan/region/model access and explicit cost approval.

- Additional plugin source: `plugins/omega-tools-fabric/` (OMEGA Tools Fabric v0.1.0)
- Tool-fabric skill mirrors: `omega/skills/omega-tools-fabric/` and `omega-mobile/skills/omega-tools-fabric/`
- OMEGA Tools Fabric repository integration: source committed; integration-specific CI/status remains unverified until GitHub reports checks for the commit.

- Additional plugin source: `plugins/railway-absolute-automation/` (Railway Absolute Automation v0.1.0)
- Railway skill mirrors: `omega/skills/railway-absolute-automation/` and `omega-mobile/skills/railway-absolute-automation/`
- Railway plugin architecture: verified Railway + GitHub app bindings; no packaged `mcp.json` / `.mcp.json`
- Railway roadmap source retained at `https://github.com/orgs/railwayapp/projects/2/views/1`; Projects v2 board contents are not claimed as read because the current GitHub connector does not expose that surface.

- Additional plugin source: `plugins/pingram-communications/` (Pingram Communications v0.1.0)
- Pingram skill mirrors: `omega/skills/pingram-communications/` and `omega-mobile/skills/pingram-communications/`
- Pingram plugin architecture: cross-platform companion with no packaged `mcp.json` / `.mcp.json`; live account actions require a separately connected regional Pingram Custom MCP App.

- Additional plugin source: `plugins/rollo-s24-ultra-agent/` (ROLLO S24 Ultra Agent v0.2.0)
- Canonical ROLLO skill: `omega/skills/rollo-s24-ultra-agent/`
- ROLLO Android bridge: validated MacroDroid macro source bundled under `plugins/rollo-s24-ultra-agent/assets/rollo-app-router.macro.json`
- ROLLO cloud bindings: Gmail, Google Calendar, Google Drive, Google Contacts, SharePoint/OneDrive, HYPD AI, Windsor.ai
- ROLLO protected operations: payments, transfers, OTP/2FA, passwords/passkeys, biometrics/PIN, government identity/signing and sensitive health actions remain user-confirmed.
- Note: `omega-mobile/skills` already contains more skills than its legacy 171-agent registry; ROLLO is not added to that legacy registry in this commit to avoid worsening the pre-existing package-validator/checksum mismatch.

- ROLLO package 2 inventory: 321 supplied entries / 318 unique application names; stored in `plugins/rollo-s24-ultra-agent/skills/rollo-s24-ultra-agent/references/app-inventory-2.md` and routed by `app-matrix-2.md`.
