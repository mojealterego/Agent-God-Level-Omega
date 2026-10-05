---
name: omega-evidence-assertiveness-gate
description: Use when responses or release notes contain factual assertions, deterministic wording, status claims, benchmarks or completion claims that must be tied to observed evidence and calibrated uncertainty.
---

# Evidence and assertiveness gate

Use this skill to prevent unsupported certainty. Strong words such as `gwarantuje`, `zapobiega`, `eliminuje`, `nigdy`, `zawsze`, `100%`, `guarantees`, `prevents` and `never` are audited before release. Deterministic language is acceptable only when a deterministic proof/evidence record actually supports the scope of that statement.

## Rules

- `OBSERVED` means directly recorded by a tool/runtime event.
- `VERIFIED` means the declared verification procedure completed with sufficient referenced evidence.
- `INFERRED`, `SPECULATIVE`, `UNVERIFIED` and `UNKNOWN` must not be silently restated as facts.
- In `STRICT` mode, the highest-risk unresolved state produces a whole-response tag: `[Wnioskowanie]`, `[Spekulacja]` or `[Niezweryfikowane]`.
- Source authority and freshness are evaluated independently from rhetorical confidence.
- Conflicting authoritative sources remain an explicit conflict; do not resolve them by averaging prose.

Use `assertiveness-audit`, `claim-verify`, `source-verify`, `response-audit`, and `reality-score`. The score supports triage only; release eligibility comes from the hard gate.

See `../../references/claim-state-model-v20.md`.
