---
name: omega-mobile-runtime-compat
description: Enforce Android/web/desktop compatibility for OMEGA v24.1 by preferring connected ChatGPT apps such as ElevenLabs over local stdio, Docker or desktop-only runtimes.
---

# OMEGA Cross-platform Runtime Compatibility

1. Assume the user may be on Android with no computer available.
2. Prefer connected ChatGPT apps and remote provider tools for every operation they can perform.
3. For ElevenLabs media/voice tasks, use the connected ElevenLabs app exposed by the host.
4. Do not require local stdio MCP, Node, Python, Docker, localhost, shell, VS Code or desktop-only setup for normal plugin use.
5. Bundled local runtime code is optional reference/implementation material only unless the current host explicitly exposes it as a connected tool.
6. If a requested operation exists only in bundled local code and no connected app exposes it, state that exact limitation instead of claiming execution.
7. Keep outputs usable on Android and verify provider-side success before claiming completion.
