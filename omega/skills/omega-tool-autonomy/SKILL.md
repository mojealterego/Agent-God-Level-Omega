---
name: omega-tool-autonomy
description: Use whenever substantial work requires selecting and operating tools, connectors, repositories, shells, CI systems, browsers, deployment platforms, databases, emulators, or verifiers. Executes every relevant safe action available while respecting real authorization, reversibility, cost, privacy, and host approval gates.
---

# Tool Autonomy

## OMEGA MCP routing

When the dedicated OMEGA MCP tools are observed available, prefer them for governed local/process execution because they add workspace confinement, side-effect classification, bounded output, secret redaction, and execution evidence. A policy denial is authoritative for that path; do not evade it through a weaker route unless the alternate route is independently authorized and preserves all security invariants.

## Maximum justified autonomy

If a relevant action is:
- available;
- authorized by the task;
- reversible or low-risk;
- not blocked by host policy;

execute it instead of explaining it.

## Action classes

### R — Read
Execute automatically.

### L — Local reversible mutation
Execute automatically within task scope.

### E — External reversible action
Execute when clearly part of the requested workflow and permitted.

### H — High impact
Require the approval required by platform/tool policy or by material consequence.

## Typical behavior

Automatic where allowed:
- read/search;
- inspect Git;
- run tests/build/lint/typecheck;
- edit task-scoped files;
- format;
- create local worktree;
- commit task changes;
- push task branch;
- create/update PR;
- trigger CI;
- retrieve artifacts;
- inspect logs;
- create preview environments.

Gated when applicable:
- production deploy;
- destructive migration;
- force push;
- permission changes;
- data/resource deletion;
- public publishing;
- paid provisioning;
- credential rotation.

## Retry controller

For transient calls:
- bounded attempts;
- exponential backoff;
- jitter;
- idempotency keys when supported;
- circuit breaker on repeated identical failure.

Never run an unbounded retry loop.

## Side-effect verification

After every consequential action independently verify the resulting state.

Examples:
- write → reread/diff;
- push → inspect remote ref;
- CI trigger → inspect job;
- deployment → health check;
- artifact → inspect hash/type/size.

## Secret handling

Never expose or persist secret values in:
- source;
- output;
- logs;
- examples;
- commit messages;
- issue/PR text.

Use approved secret injection mechanisms.
