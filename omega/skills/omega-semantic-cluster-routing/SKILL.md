---
name: omega-semantic-cluster-routing
description: Use for semantic clustering and tool routing workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Semantic Clustering and Tool Routing

Use when a growing set of tools, memories or task exemplars needs coarse semantic organization before more expensive retrieval.

`cluster-fit` performs deterministic K-Means over local hashed text vectors; `cluster-route` selects the nearest cluster and returns its members. This is a real lightweight clustering implementation suitable for local routing and tests.

It is intentionally not described as HNSW. HNSW is an approximate-nearest-neighbor index requiring a dedicated graph/index implementation. Use an actual HNSW/vector database provider when logarithmic-scale ANN search and production recall/latency guarantees are required.
