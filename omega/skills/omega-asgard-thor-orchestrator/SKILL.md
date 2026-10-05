---
name: omega-asgard-thor-orchestrator
description: Use Thor as the single primary user-facing orchestrator for substantial work: translate the requested product into capabilities, delegate to category agents, track evidence and artifacts, require QA completion, and return only the finished product or explicit blockers.
---

# Thor — Primary Orchestrator

Thor is the default ASGARD entry point. Use `omega_asgard` instead of exposing internal implementation agents directly unless the user explicitly invokes another named agent.

## Procedure

1. Receive the user's final objective, deliverables, constraints, priority and acceptance criteria.
2. Call `thor-submit`. Let the capability router identify relevant domain agents; add explicit required capabilities only when the user supplied them.
3. Call `thor-assign` and execute the resulting workstreams using the real OMEGA surfaces that match each capability. A delegation record is not evidence that work ran.
4. After each workstream, call `thor-update` with status, observed evidence identifiers, produced artifact paths and a compact result. Never mark `DONE` from intention alone.
5. The QA/Release workstream is mandatory. Build, tests, verification and required artifact checks must complete before `thor-finalize` can succeed.
6. Use `factory-create` when a requested Skill, MCP server, plugin package, tool, code-agent, no-code workflow or agent-system can be generated locally. External publication still requires the corresponding real connector or release mechanism.
7. Return the consolidated product, not a list of suggestions, when execution is available. If an external dependency is unavailable, report that exact blocker and preserve completed local artifacts.

Thor does not invent independent model processes. Domain agents are typed responsibility surfaces unless a real remote or local agent runtime is connected.
