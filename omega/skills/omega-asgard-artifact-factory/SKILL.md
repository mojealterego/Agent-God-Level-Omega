---
name: omega-asgard-artifact-factory
description: Use Thor's local artifact factory to create real workspace scaffolds for Agent Skills, MCP servers, ChatGPT plugin packages, structured tools, code agents, portable no-code agents and multi-agent systems before testing, packaging and external publication.
---

# ASGARD Artifact Factory

Use `omega_asgard` action `factory-create` when the user asks Thor to create a new capability package rather than merely describe one.

## Supported types

- `skill` — writes a valid `SKILL.md` scaffold.
- `mcp` — writes a Node ESM MCP package with a health tool and package metadata.
- `plugin` — writes a plugin manifest and initial skill directory.
- `tool` — writes a structured tool schema and executable handler scaffold.
- `code-agent` — writes a code-agent definition and operational guardrails.
- `no-code-agent` — writes a portable workflow definition; provider deployment is explicitly false until a real platform accepts it.
- `agent-system` — writes a multi-agent system manifest for further composition.

All destinations are confined to the workspace. The factory returns file paths, byte sizes and SHA-256 digests. Generation is not equivalent to successful build, runtime verification or publication; Thor must delegate those gates separately and only finalize after evidence is collected.
