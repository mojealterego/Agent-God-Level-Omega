---
name: omega-tools-fabric
description: Use OMEGA Tools Fabric to discover, route and orchestrate advanced connected tools, apps, MCP systems, agent frameworks, automation engines, cloud platforms, repositories, databases, design systems and communication channels across Android, web and desktop.
---

# OMEGA Tools Fabric

OMEGA Tools Fabric is a governed meta-orchestrator. It does not pretend that every framework is a live connector. It separates three layers:

1. **Connected app layer** — real `.app.json` bindings that the host may expose.
2. **Live tool layer** — tools actually present in the current conversation/runtime.
3. **Framework registry** — architectural frameworks and execution patterns that can be selected when implementing or extending systems.

## Android / cross-platform contract

Assume the user may have only an Android phone. Normal operation must not require desktop-only `stdio`, Docker, localhost, VS Code, shell access or a PC. This package intentionally contains no `mcp.json` or `.mcp.json`.

If a task truly needs a local-only runtime, label it as an optional execution lane rather than making it a prerequisite for using the plugin.

## Discovery algorithm

Before significant work:

1. Determine the user's objective and irreversible-risk boundary.
2. Inspect live tools/apps relevant to the objective.
3. Prefer verified app bindings over guessed provider capabilities.
4. Load the minimum framework pattern from `references/framework-registry.md`.
5. Build a tool graph: source -> transform -> act -> verify -> evidence.
6. Execute reversible steps autonomously when authorized by the task.
7. Gate destructive, costly, externally visible or permission-changing actions according to host/provider policy.
8. Verify the final state using provider-native evidence.

Never infer success from a tool call request alone.

## Routing domains

### Software engineering
Use GitHub or GitLab as source-of-truth repositories. Route planning and implementation through issue/branch/PR/MR/CI evidence. Use OpenAI Platform for OpenAI API/product integration guidance and Vercel/Replit/Railway/Render for supported deployment lanes.

### Agent/MCP systems
Choose from MCP, MCP Apps, OpenAI Extensions, Skybridge, Noodle Seed, Eve, Vercel AI SDK, LangGraph, AutoGen, CrewAI, Semantic Kernel, PydanticAI, DSPy, LlamaIndex, Mastra, Google ADK, Strands Agents and related patterns based on durability, state, tool topology and deployment target. A framework name in the registry is not evidence that it is connected as a live tool.

### Backend/data
Prefer Supabase, Neon or the connected provider whose database/project is authoritative. Use schema-first inspection and migrations; do not run destructive SQL as a connectivity test.

### Product/design
Use Figma for editable product design, Notion/Google Drive for source documentation and Linear for product planning when those systems are authoritative.

### Communication
Use Slack/Gmail/AgentMail/Calendar/Contacts/RingCentral only for capabilities actually exposed by their live tools. Do not infer WhatsApp, Telegram, Signal, Instagram DM or other channel access from generic communication capability.

### Commerce
Use Shopify only within the connected store/account and live tool permission boundary.

## Multi-agent execution model

Use roles rather than spawning agents blindly:

- **Architect**: decomposes goals and invariants.
- **Retriever**: gathers authoritative context.
- **Implementer**: performs bounded writes.
- **Verifier**: tests independently from the implementation assumptions.
- **Security/Governance**: checks permissions, secrets, destructive effects and compliance.
- **Release**: validates deployment/release evidence.

Parallelize only independent reads or non-conflicting work. Serialize writes that share state.

## Evidence gates

A claim is `verified` only when backed by one of:
- provider response confirming the mutation;
- repository commit/ref/PR/MR state;
- CI/test result;
- deployment status and live endpoint state;
- database query showing intended state;
- explicit live tool output.

Otherwise label it planned, attempted, pending, blocked or unverified.

## Dynamic extension rule

When the user asks for a capability not present in `.app.json`:

1. search the plugin/app catalog when available;
2. inspect the candidate's dependencies/app ID;
3. use the real connected app if available;
4. otherwise route through an existing MCP/custom app only if the host exposes it;
5. never fabricate app IDs, endpoints, scopes or tools.

See references for the framework registry, routing policy and governance.
