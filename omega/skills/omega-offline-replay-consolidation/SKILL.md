---
name: omega-offline-replay-consolidation
description: Use for experience replay, memory consolidation, duplicate removal, stale-memory decay and offline maintenance without pretending to retrain model weights.
---

# Offline Replay and Consolidation

This skill converts the "digital sleep" concept into implementable maintenance routines.

## Replay

Persist difficult, high-impact or high-surprise episodes in the replay buffer with priorities. During a maintenance window, sample the highest-priority experiences for regression tests, prompt evaluation, agent review or external training jobs.

## Consolidation

- Remove exact duplicate memories by content hash.
- Preserve the newest duplicate and merge useful metadata when appropriate.
- Expire stale non-pinned entries according to an explicit retention policy.
- Never delete pinned/fundamental records solely because of age.
- Use memory defragmentation to merge duplicate tags and compact indexes.

## Safety

Offline maintenance may reorganize OMEGA-owned memory/index data. It must not delete source repositories, production databases or external user data unless an explicit destructive-data workflow authorizes that action.

Actions: `replay-add`, `replay-sample`, `memory-consolidate`, `memory-defrag`.

Replay and consolidation improve retrieval and evaluation. They are not equivalent to synaptic replay or weight-space pruning unless a real training backend is attached.
