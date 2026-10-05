---
name: omega-rag2-memory-fusion
description: Use when retrieval must combine temporal episodes, semantic hierarchy, multi-agent graph insights, symbolic associative memory, and provenance instead of relying on one vector search. Implements an evidence-fused RAG 2.0 style retrieval layer.
---

# Hybrid RAG 2.0 Memory Fusion

## Retrieval sources

Fuse:
- bitemporal episodic memory;
- semantic SHIMI hierarchy;
- G-Memory interaction/query/insight graphs;
- HDC/holographic symbolic associations;
- repository/file evidence when task context requires it.

## Temporal correctness

A retrieval request may carry:
- valid time;
- transaction time.

Do not leak later knowledge into a historical replay.

## Fusion

Each source returns independently scored evidence.

Normalize scores per source, preserve provenance, deduplicate only identical evidence identities, then rank the fused set.

## Grounding

Retrieved memories are candidates, not truth.

Before a memory controls a repository mutation:
- verify freshness;
- reread the authoritative source when available;
- invalidate stale memories after source changes.

## Failure behavior

If retrieval is weak or contradictory, request more primary evidence rather than filling the gap with inference.
