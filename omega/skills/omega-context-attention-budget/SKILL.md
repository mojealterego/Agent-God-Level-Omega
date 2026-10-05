---
name: omega-context-attention-budget
description: Use for context and attention budget workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Context and Attention Budget

Use when prompts, logs, retrieved documents or multi-agent handoffs risk exceeding context limits or diluting critical instructions.

Represent context items with estimated token cost and salience. `context-compact` preserves the most recent interaction window plus older high-salience evidence under a hard token budget. Keep acceptance criteria, security constraints, current failures and exact source pointers at highest salience.

Never describe a lossy summary as reversible memory. Full fidelity requires retaining the primary source or a verified reversible store. Do not rely on hidden model memory for project-critical facts.

For long tasks combine this skill with OMEGA checkpoints and content-addressed evidence pointers.
