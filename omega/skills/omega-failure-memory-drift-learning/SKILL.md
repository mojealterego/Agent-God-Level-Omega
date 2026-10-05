---
name: omega-failure-memory-drift-learning
description: Use for failure memory, retrospective learning and drift workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Failure Memory, Retrospective Learning and Drift

Use when repeated engineering failures, operational incidents or changing input distributions should influence future routing.

Store failures with task, error and a concrete lesson using `failure-add`. Before similar work, query `failure-search`; the local reference retriever uses deterministic hashed-vector cosine similarity and persistent JSON storage.

Use `drift-observe` to build the historical centroid and `drift-score` to flag distribution changes. The built-in detector is lightweight reference anomaly detection, not a substitute for production MLOps drift platforms on high-dimensional model features.

Preference feedback can be stored with `preference-add`, but this runtime does not modify foundation-model weights or claim RLAIF/DPO training.
