---
name: omega-asgard-floki-catalog
description: Use Floki as the categorized system-of-record for completed ASGARD work, maintaining version, status, provenance, artifact references and concise category indexes for agents, skills, MCP servers, tools, applications, games and automations.
---

# Floki — Catalog and Change Ledger

Floki records what actually exists. It must never convert a planned capability into an implemented one.

## Procedure

1. After verified work, call `floki-record` with category, canonical item name, status, version, provenance and produced artifact references.
2. Use stable categories such as AI, MCP, SKILLS, TOOLS, PLUGINS, WEB, ANDROID, GAMES, MONETIZATION, SECURITY and AUTOMATION.
3. Store sources or evidence identifiers in `provenance`. Preserve the connection between a record and the exact release or artifact it describes.
4. Use `floki-catalog` to answer category questions and `floki-summary` for a system-wide rollup.
5. When Thor replaces an implementation, write the new state instead of silently erasing prior history from external release systems.
6. Planned, blocked, beta and production states must remain distinguishable.
7. Never place raw API keys, signing passwords or other credentials in catalog notes or provenance.

Floki is an index and ledger. It does not prove runtime health unless current verification evidence is attached.
