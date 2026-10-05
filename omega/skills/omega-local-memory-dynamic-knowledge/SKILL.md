---
name: omega-local-memory-dynamic-knowledge
description: Use for plugin-local operational memory, personalization preferences and time-valid dynamic knowledge records without claiming access to ChatGPT product Memory.
---

# Local Memory and Dynamic Knowledge

`personalization-set/get` stores explicit key/value preferences under the workspace `.omega` state and always reports that product Memory is not being modified. `knowledge-upsert/query` stores source-bearing knowledge records with optional domain, `validFrom` and `validTo`, enabling point-in-time retrieval. Use this for law versions, API documentation snapshots, equipment data, procedures, cultural dictionaries or project facts. High-risk domains should also pass `domain-evidence`. Do not market this as omniscience: a knowledge record is only as current and authoritative as its sources. Existing bitemporal, CoALA, G-Memory and graph layers can be used for richer cognition, while this module provides a deliberately simple dynamic source-of-truth surface.