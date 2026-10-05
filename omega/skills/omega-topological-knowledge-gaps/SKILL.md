---
name: omega-topological-knowledge-gaps
description: Use for bounded topological analysis of vector point clouds and knowledge-gap discovery. Computes Vietoris-Rips 1-skeleton connectivity and graph-cycle structure without claiming full persistent homology.
---

# Topological Knowledge-Gap Analysis

Use `topology-analyze` on supplied vectors with an explicit distance threshold. The runtime computes edges, connected components (`Betti-0`) and graph cyclomatic rank as a bounded `Betti-1` proxy for the 1-skeleton.

Treat low-degree or disconnected regions as investigation candidates, not proof of an unknown concept. Full higher-dimensional persistent homology requires a dedicated TDA provider and is not claimed by this local implementation.
