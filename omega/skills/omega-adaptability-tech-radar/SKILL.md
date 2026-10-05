---
name: omega-adaptability-tech-radar
description: Use for adaptability and technology radar workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Adaptability and Technology Radar

Use when deciding whether to retain, trial, adopt or hold a framework, model, database, runtime or provider.

Record candidates in `omega_meta_architect` using `radar-upsert` with one of `ADOPT`, `TRIAL`, `ASSESS`, `HOLD`, plus observed evidence and risks. Promote a technology only after evidence improves: benchmark, shadow traffic, security review, migration rehearsal and operational support.

Preserve model/provider agnosticism through facades and the adaptive router so replacing a vendor does not require rewriting business logic. Existing custom code is not privileged merely because the team authored it.

The Tech Radar is an evidence register, not an autonomous internet trend scanner. External research still requires an actual search/data source.
