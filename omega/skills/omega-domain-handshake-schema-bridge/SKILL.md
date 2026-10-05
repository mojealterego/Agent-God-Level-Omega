---
name: omega-domain-handshake-schema-bridge
description: Use for safe domain-policy switching, declared capability handshakes, legacy fixed-width integration and confidence-bounded schema alignment across systems.
---

# Domain, Handshake and Schema Bridges

## Domain profiles

Switch domain-specific risk thresholds, naming/style policies, compliance requirements and allowed tools using a persistent profile. Report `weightsChanged=false` unless a training job actually ran.

## Capability handshake

Negotiate against declared MCP/OpenAPI/schema capabilities. Check required features and versions; do not infer undocumented operations by aggressive probing.

## Legacy bridge

Use fixed-width codecs and explicit mapping contracts for deterministic legacy records. Preserve raw source records for audit.

## Schema alignment

Map only known field names/aliases. Missing required fields remain unresolved and should trigger a clarification or rejection rather than guessed data.

Actions: `domain-upsert`, `domain-activate`, `handshake-negotiate`, `legacy-decode`, `legacy-encode`, `schema-align`.
