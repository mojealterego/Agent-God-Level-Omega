---
name: omega-decision-trace-audit
description: Use for decision trace audit workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Decision Trace Audit

Use when a decision must be reviewed for evidence coverage without exposing or depending on private chain-of-thought.

Provide a concise structured decision, individual factual claims and the evidence IDs supporting each claim. `trace-audit` verifies that every claim references existing evidence and that evidence intended to satisfy a hard completion predicate is `OBSERVED` rather than inferred or unknown.

The result explicitly states `hiddenChainOfThoughtRequired=false`. Mathematical or formal reasoning should be checked with an appropriate solver/verifier from the neuro-symbolic layer, not by parsing private internal reasoning text.
