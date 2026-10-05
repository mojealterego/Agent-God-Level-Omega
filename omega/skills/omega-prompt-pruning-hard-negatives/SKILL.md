---
name: omega-prompt-pruning-hard-negatives
description: Use to minimize context cost while preserving hard constraints and to prioritize severe failures as hard negatives for evaluation or external training datasets.
---

# Prompt Pruning and Hard-Negative Mining

## Prompt pruning

Rank context segments by required status, recency and task priority. Preserve hard constraints even when they exceed the nominal budget, then include the highest-value remaining segments that fit. Report dropped segment identifiers.

Do not remove syntax or grammar mechanically from user instructions when that could change semantics. Deterministic token pruning is suitable for structured context blocks; abstractive summarization requires a real summarizer and separate verification.

## Hard negatives

Rank failures by severity, novelty and recurrence. Use the highest-hardness records for regression tests, adversarial evaluation, replay or an external trainer.

Actions: `prompt-prune`, `hard-negative-rank`.

Hard-negative mining changes dataset/evaluation priority. It does not itself apply gradients to a model.
