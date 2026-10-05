---
name: omega-strategic-dag-knowledge-graph
description: Use for strategic dag planning and organizational knowledge graph workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Strategic DAG Planning and Organizational Knowledge Graph

Use for multi-step migrations, releases, investigations and other workflows with explicit dependencies.

Represent executable work as a DAG. `dag-run` validates dependency references, detects cycles, runs independent nodes concurrently within a bounded concurrency limit and starts dependent commands only after predecessors succeed.

After a solved engineering problem, enrich the persistent knowledge graph using `kg-node` and `kg-link`, for example `Bug -> RESOLVED_BY -> Script` or `Service -> DEPENDS_ON -> Database`. Query relationships with `kg-neighbors` before repeating investigation work.

The built-in graph is a persistent local reference implementation. Large organizational graphs can be backed by Neo4j or another graph database through an external provider.
