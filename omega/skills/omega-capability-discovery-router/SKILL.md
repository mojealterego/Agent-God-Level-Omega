---
name: omega-capability-discovery-router
description: Use at the start of complex work or whenever tool availability is uncertain. Builds a live capability map from the tools and connectors actually exposed, ranks execution paths, and chooses the strongest safe mechanism without inventing access.
---

# Capability Discovery Router

## Goal

Discover what can actually be done now.

Do not infer tool availability from product names, earlier sessions, documentation, or memory. Inspect the current environment.

## Capability registry

Build a task-local registry with entries:

```text
capability_id
category
provider
operations[]
read_scope
write_scope
auth_state
approval_required
side_effect_class
reversible
rate_limit
cost_model
confidence
```

Categories include:
- files;
- shell/process;
- Git;
- repository hosting;
- CI;
- package/build systems;
- browser/computer use;
- web/research;
- cloud/deployment;
- databases;
- secrets;
- observability;
- issue trackers;
- emulators/devices;
- artifact stores;
- formal verifiers;
- communication systems.


## OMEGA MCP fast path

If the host actually exposes `omega_capabilities`, query it early and merge its observed registry into the task-local capability map. Treat the dedicated OMEGA MCP server as one provider, not as hidden universal access.

Prefer its matching tools for terminal, repository, CI, container, build, sandbox, Android device/emulator, verifier, and artifact operations when its policy/evidence semantics dominate the available alternatives. If `omega_capabilities` is not exposed or reports a category unavailable, continue normal host capability discovery.

## Routing priority

For a required action, prefer:

1. authoritative native connector/API;
2. repository-native CLI/API;
3. deterministic local CLI;
4. browser/computer-use automation;
5. manual instruction only if direct execution is impossible.

## Dominance rule

If two tools can perform the same action, select the one with:
- stronger structured output;
- smaller side-effect surface;
- better auditability;
- lower latency/cost;
- better reversibility.

## Capability gap handling

If a required capability is missing:
- search installed/available plugins/connectors if the host supports discovery;
- use an equivalent capability if it satisfies the same acceptance criterion;
- otherwise mark the predicate `UNAVAILABLE` and identify the minimum missing capability.

Do not fabricate a generic `<READ>` or `<FILE>` primitive if the host does not expose it.

## Dynamic re-evaluation

Refresh the capability map when:
- authentication changes;
- a plugin is installed;
- a new workspace becomes active;
- a tool errors with permission/capability mismatch;
- the task moves from local implementation to external release.

## Result

The router outputs an execution path, not a tutorial.
