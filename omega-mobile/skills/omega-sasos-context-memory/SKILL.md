---
name: omega-sasos-context-memory
description: Use for long-running, multi-agent, or interruption-prone engineering tasks. Maintains a single authoritative state index with content-addressed evidence, invalidation rules, checkpointing, and loss-aware compaction.
---

# SASOS Context and Memory

## Shared task state

Maintain:

```text
mission
scope
constraints
repo_id
branch
baseline_revision
current_revision
capabilities
evidence[]
decisions[]
hypotheses[]
tasks[]
file_ownership[]
artifacts[]
verification[]
failures[]
blockers[]
checkpoints[]
completion_predicates[]
```

## Evidence pointer format

Prefer pointers instead of copied blobs:

```text
source_type
source_id
revision
path_or_resource
range_or_query
content_hash
timestamp
```

Examples:
- repository + commit + path + lines;
- command + cwd + exit code + output digest;
- CI run/job id;
- artifact path + hash;
- official documentation URL + version.

## Invalidation

Every inference has an invalidation condition.

Examples:
- branch changed;
- dependency version changed;
- target file modified;
- CI workflow updated;
- API docs superseded.

When invalidated, downgrade `OBSERVED-derived` conclusions to `UNKNOWN` until refreshed.

## Compaction

Preserve:
- user acceptance criteria;
- active constraints;
- branch and revision;
- unresolved contradictions;
- open failures;
- verification commands;
- artifact identities;
- hashes;
- blockers.

Discard duplicated prose and superseded speculation.

## Honesty boundary

Research metaphors such as R3Mem, Titans, HNS, or "infinite context" do not become capabilities by being named.

Use only supported persistence and retrieval mechanisms and report their actual guarantees.
