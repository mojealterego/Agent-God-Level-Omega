---
name: omega-confidence-hitl-clarification
description: Use for confidence, human review and clarification workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Confidence, Human Review and Clarification

Use when uncertainty, ambiguity or action risk is too high for automatic execution.

`confidence-gate` compares calibrated confidence against separate normal and high-risk thresholds and returns either automatic execution or human review. Confidence must come from an actual calibration/evaluation process when stakes are high; arbitrary self-reported LLM confidence is not sufficient evidence.

For ambiguous references use `fuzzy-resolve`. When multiple candidates have close scores, ask a specific clarification rather than guessing.

This gate complements, and never bypasses, host approval requirements for destructive, financial, legal, medical, permission-changing or production-impacting actions.
