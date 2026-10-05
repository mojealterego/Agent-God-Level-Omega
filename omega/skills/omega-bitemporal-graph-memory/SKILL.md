---
name: omega-bitemporal-graph-memory
description: Use when agent memory must preserve what was believed at a past transaction time separately from when a fact was valid in the modeled world. Implements append-only bitemporal facts, retrospective correction, temporal graph edges, audit history, and point-in-time recovery.
---

# Bitemporal Graph Memory

## Purpose

Represent two clocks independently:

- **valid time** — when a fact is true in the modeled world;
- **transaction time** — when OMEGA learned, asserted, corrected, or retracted that fact.

Never overwrite history when correcting memory.

## Write model

Facts are append-only assertions with:
- assertion id;
- key/entity;
- value;
- valid-from / valid-to;
- transaction timestamp;
- provenance metadata.

Correction means:
1. append a retraction of the prior assertion at a later transaction time;
2. append a corrected assertion;
3. retain both events forever unless an explicit retention policy permits archival.

## Query model

Every temporal query specifies:
- `validAt`;
- `transactionAt`.

This enables:
- current truth;
- "what did the agent believe yesterday?";
- "what was valid last week using only knowledge available then?";
- retrospective correction audits;
- reproducible decision replay.

## Graph model

Store nodes and relations as bitemporal facts.

A graph traversal must be evaluated against one consistent `(validAt, transactionAt)` pair.

## Point-in-time recovery

Recovery reconstructs visible assertions from the append-only journal at a selected transaction time. It is not a mutable snapshot pretending that later corrections never happened.

## MCP

When exposed, use `omega_memory` actions:
- `assert`
- `correct`
- `retract`
- `query`
- `history`
- `snapshot`

Do not claim temporal recovery unless the underlying journal was actually queried.
