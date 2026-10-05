---
name: omega-semantic-cache-temporal-decay
description: Use for exact or similarity-based reuse of prior results with TTL, provenance and temporal knowledge decay so stale answers lose ranking over time.
---

# Semantic Cache and Temporal Decay

Use the semantic cache before expensive model or tool calls when a previous result may satisfy the same request.

## Cache rules

- Prefer exact key hits when the task identity is stable.
- Use similarity hits only above an explicit threshold.
- Attach TTL and provenance to cached values.
- Revalidate or bypass the cache for volatile, security-sensitive or version-specific data.
- Never reuse an answer whose source revision or dependency version has been invalidated.

Use temporal ranking for long-term knowledge: non-pinned records decay according to the configured half-life, while fundamental/pinned knowledge retains its base score.

Actions: `cache-put`, `cache-get`, `knowledge-score`.

Hashed-vector similarity is a deterministic local fallback; it is not equivalent to a production embedding model or Redis vector index unless those are actually connected.
