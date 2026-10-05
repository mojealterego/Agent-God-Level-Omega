---
name: omega-skill-catalog-dedup
description: Use when importing, comparing, or maintaining many Agent Skills. Normalize capabilities, cluster duplicate or near-duplicate skills, choose one evidence-backed canonical implementation, retain aliases, and expose only name/description during discovery.
---

# Skill catalog deduplication

## Procedure

1. Inspect the existing OMEGA capability catalog before adding anything new.
2. Reuse an existing capability when semantics and safety boundaries already match.
3. Add a new capability only when it contributes a distinct executable mechanism.
4. Keep discovery metadata concise; load detailed references only when activated.
5. Verify consequential behavior with tests or observed tool output.
6. Never convert an external project claim into an OMEGA capability claim without local or provider evidence.

See `../../references/ecosystem-research-v14.md` for provenance and `../../references/dedup-policy-v14.md` for canonicalization rules.
