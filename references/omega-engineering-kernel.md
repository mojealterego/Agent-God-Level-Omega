# OMEGA engineering execution contract

- Owning source: `mojealterego/Agent-God-Level-Omega` (not a separate app).
- Action: `[THOR-CODE] js|py|go|rs <slug>` in an owner-authored GitHub issue.
- Authentication: existing signed GitHub Actions OIDC bound to repo+actor+workflow+runId+branch. Host Lovable AI gateway currently has exactly three permitted model stages per run and daily quota.
- Runtime: `scripts/omega-engineering-runner.mjs` delegating to the existing `scripts/thor-lovable-agent.mjs` inference adapter, `scripts/omega-engineering-kernel.mjs` for code contract, sandbox and proof.
- Fixed agent roles: `architect`, `implementer`, `qa-reviewer`; role-specific language specialties are specified by deterministic route profiles. Only three calls count as separate LLM invocations.
- Safety: task body and generated code are untrusted; bounded lengths/schema, test contract and generated file names; ephemeral locked-down Docker, only source/test volume, no runner credentials; mandatory user review in a draft PR.
- Artifacts: exact code, tests, README and SHA-256 receipt under an issue-unique branch. Receipt states GENERATED_UNTESTED until test proof; issue comment provides observed status.
- Failure modes: model budget, invalid JSON, static test-contract rejection, provider unavailability, Docker unavailable, tests fail, QA BLOCK, git publication or GitHub policy. No automatic fallback to fake success or broadened write scope.
- Not supported by this lane: arbitrary repository file edits, general multi-file package builds, actual Android/Flutter APK, Unreal/Unity AAA compilation, production-grade secrets/deploy, indefinite autonomous loops. Those require separate approval-gated adapters and observed CI integration.
