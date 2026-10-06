# Omni-Architect v1/v2 → OMEGA v22 Integration

OMEGA v22 absorbs the supplied Omni-Architect packages as a competency plane, not as a second user-facing plugin.

## Source archive provenance

- `omni-architect.zip` — SHA-256 `303bfc0f078a197716e08cc346b15e6aa2d9a4d0d454f6da8eb8f62b66687506`
- `omni-architect-v2.0.0.zip` — SHA-256 `6c2f32ff5c6d8ff3464aee205d031ca600cc157f6f18c5786fc2d27bdf938477`

The v1 archive contains five skills: Omni Core, Evidence Engine, Deep Research, Software Engineering and Blue Team Security. v2 contains seventeen competency skills and quality-gate guidance.

OMEGA does not copy these skills one-for-one because that would duplicate existing ASGARD, Reality Filter, CI, repository, MCP, Android, security and orchestration capabilities. Instead, `omega_omni_architect` exposes a deduplicated runtime and `OMNI_V22_COMPETENCY_MAP` records the canonical OMEGA owner of each imported competency.

## New executable contracts

The v22 plane adds bounded implementations for Source-of-Truth Registry v2, Decision/Evidence Ledger v2, prompt-injection screening, repository audit, CI state separation, Google record normalization, MCP routing, Android release gate, agent eval contracts, cloud deployment verification and ADR persistence. Live external operations are delegated to existing OMEGA callbacks and remain unavailable when the real host/tool/provider is unavailable.
