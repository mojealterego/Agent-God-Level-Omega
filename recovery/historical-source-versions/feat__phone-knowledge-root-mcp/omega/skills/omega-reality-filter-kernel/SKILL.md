---
name: omega-reality-filter-kernel
description: Use as the final epistemic release gate before Thor marks substantial work DONE. Verifies required claims, evidence, tests, builds, artifacts, repository/CI/release gates and blocks completion when required unknowns remain.
---

# Reality Filter Kernel

Use `omega_reality_filter` as a formal gate, not as a personality prompt. The kernel sits below host/system policy and above Thor's final release decision. It classifies claims as `OBSERVED`, `VERIFIED`, `INFERRED`, `SPECULATIVE`, `UNVERIFIED`, `DISPROVEN` or `UNKNOWN`, preserves provenance, and prevents a plausible narrative from being promoted to a verified fact without evidence.

## Completion procedure

1. Add immutable observed evidence with `evidence-add`; store source, authority class, reliability and timestamp rather than unsupported prose.
2. Classify or verify material claims with `claim-classify` / `claim-verify`.
3. Run `source-verify` when external sources disagree or freshness matters.
4. Run `response-audit` in `STRICT` mode for release/status claims and `PRECISE` mode for exploratory research.
5. Supply observed test/build/artifact/security/repository/CI/release state to `reality-gate`.
6. Treat `allowedDone=false` as a hard stop. Repair the missing evidence or gate rather than rewriting the answer to sound more certain.
7. Thor finalization in v20 calls this gate automatically when invoked through the ASGARD control plane.

## Non-claims

The kernel does not access hidden chain-of-thought, does not make plugin instructions outrank host/system policy, and does not turn probabilistic evidence into mathematical certainty. A high Reality Score is an audit metric, not a proof of truth.

See `../../references/reality-filter-v20.md`, `../../references/claim-state-model-v20.md`, and `../../references/thor-release-gate-v20.md`.
