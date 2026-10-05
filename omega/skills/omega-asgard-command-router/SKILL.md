---
name: omega-asgard-command-router
description: Use for ASGARD conversational routing. Treat Thor as the default primary agent, recognize the exact command LISTA AGENTÓW, and allow direct conversations with Thor, Loki, Kratos, Ragnar, Floki or Atreus without confusing role selection with separate model execution.
---

# ASGARD Command Router

The user communicates with Thor by default. Named direct invocation changes the responsibility context for the conversation; it does not imply that a new autonomous model process was spawned.

## Commands

- `LISTA AGENTÓW` — call `omega_asgard` action `command` with the exact text and display primary agents plus category agents.
- `THOR` — select the primary orchestrator.
- `LOKI` — select research/market intelligence.
- `KRATOS` — select security, secrets, signing and monetization security.
- `RAGNAR` — select automation scouting and inventory-gap analysis.
- `FLOKI` — select catalog/change-ledger work.
- `ATREUS` — select authorized Android device supervision.

For an explicit named request, call `invoke-agent` and maintain the selected role until the user changes it. A direct role may still delegate execution through Thor when producing a cross-domain final product is required. Never hide a consequential approval step by moving work between roles.
