---
name: omega-epistemic-defragmentation
description: Use to scan accumulated knowledge for conflicting claims, quarantine unresolved contradictions and resolve only conflicts with a sufficient observed-evidence margin.
---

# Epistemic Defragmentation

Run `epistemic-defrag` over explicit belief records containing key, value, perspective, confidence and evidence references. Group only claims that address the same key under the same perspective. If competing values have a decisive confidence margin, record a provisional winner and preserve rejected alternatives. If the margin is insufficient, quarantine the contradiction instead of rewriting history.

This loop does not promise absolute axiomatic consistency. It is an evidence-maintenance operation. Keep original records, contradiction provenance and resolution reason so later evidence can reverse a prior conclusion. Never use a generative model alone as the tie-breaker for a safety-critical conflict.
