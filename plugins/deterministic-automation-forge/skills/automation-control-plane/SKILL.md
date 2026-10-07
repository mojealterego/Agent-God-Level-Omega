---
name: automation-control-plane
description: Route and execute multi-system automation involving Intercom, GitHub, GitHub Codespaces, or browser-operated web applications with evidence-gated, fail-closed controls. Use for any workflow that spans more than one system or needs planning, execution, verification, rollback, audit evidence, or throughput optimization.
---

# Automation Control Plane

Use this skill as the primary orchestrator.

## Execution invariant

A claimed completion is not evidence. A job may reach `VERIFIED_SUCCESS` only when every required postcondition has a direct read/re-observation from the target system.

## State machine

Use these states in order unless a stop condition fires:

- `DISCOVER`: exact systems, targets, identities, repository names, URLs and object IDs.
- `BIND`: map each required capability to an actually available host tool using `runtime-executor`.
- `AUTH`: verify connector authorization or browser profile coverage before protected reads/writes.
- `PLAN`: construct the smallest dependency DAG that reaches the goal.
- `PRECHECK`: validate identities, invariants, base SHAs, current UI state, permissions and destructive scope.
- `EXECUTE`: perform mutations in dependency order and collect receipts.
- `VERIFY`: independently re-read/re-observe all required postconditions.
- `COMMIT`: finalize only after verification passes.
- `COMPENSATE`: reverse or reconcile partial work only when the previous state and safe recovery action are known.
- `AUDIT`: emit evidence and unresolved risk.

## Hard gates

1. No tool binding → `TOOL_UNAVAILABLE`.
2. Required authenticated target without confirmed auth → `AUTH_REQUIRED`.
3. Ambiguous target → `TARGET_AMBIGUOUS`.
4. Stale Git blob/ref or changed UI object → `TARGET_CHANGED` and re-discover.
5. Mutation without verifiable postcondition → `BLOCKED_UNVERIFIED`.
6. Browser run with uncertain terminal state → keep the same run ID; never duplicate the mutation.
7. Writes to the same resource are serialized. Independent reads may run in parallel.
8. No passwords, session cookies, API tokens, or secrets are requested in chat or written to repositories.
9. Codespaces VM host-image preference and repository dev-container configuration are separate state domains and must never be merged into one claim.

## Cross-system transaction protocol

For jobs spanning multiple systems, use a two-phase discipline:

### Phase A — Prepare

- bind tools;
- authenticate;
- read current state from every affected system;
- freeze target identities and invariants;
- compute planned mutations and compensation actions;
- refuse execution if any required system cannot be verified.

### Phase B — Execute and verify

- mutate one dependency layer at a time;
- immediately capture the mutation receipt;
- independently verify the result;
- advance only after the layer passes;
- if a later layer fails, use compensation only where the previous state is evidenced and the reversal is safe.

## Role routing

- Tool discovery/binding: `runtime-executor`
- Intercom: `intercom-operator`
- Intercom↔GitHub transaction: `intercom-github-bridge`
- GitHub implementation: `github-engineer`
- GitHub Codespaces Stable/Beta host image: `codespaces-host-image-operator`
- First-time site certification: `site-registrar`
- Generic website work: `web-operator`
- Independent checks: `verifier-auditor`
- Failures/reconciliation: `recovery-agent`
- Safe concurrency: `throughput-optimizer`

## Required final status

Use exactly one:

- `VERIFIED_SUCCESS`
- `PARTIAL_SUCCESS`
- `AUTH_REQUIRED`
- `TOOL_UNAVAILABLE`
- `TARGET_AMBIGUOUS`
- `BLOCKED_UNVERIFIED`
- `FAILED_RECOVERED`
- `FAILED_REQUIRES_ACTION`

Never collapse an auth/tool/verification blocker into generic success.
