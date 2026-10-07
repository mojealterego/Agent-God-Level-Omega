---
name: intercom-github-bridge
description: Execute an evidence-preserving transaction between an Intercom Fin/Automation configuration and a GitHub repository, carrying exact observed requirements into repository changes and validating both sides before reporting completion.
---

# Intercom ↔ GitHub Bridge

Use when an Intercom automation/Fin finding requires repository work, or repository changes must be reflected back into Intercom configuration.

## Prepare

1. Use `runtime-executor` to bind Intercom access and GitHub access.
2. Read the exact Intercom object and produce an `IntercomSnapshot`.
3. Resolve the exact `owner/repo`, base branch and base SHA.
4. Produce an `EngineeringChangeRequest` containing only:
   - explicit user requirements;
   - directly observed Intercom evidence;
   - directly observed repository evidence.
5. Define acceptance criteria and compensation boundaries before writes.

If Intercom authentication is unavailable, stop the Intercom side with `AUTH_REQUIRED`. GitHub reconnaissance may still proceed only if it does not require assumptions from unread Intercom state.

## GitHub implementation

Delegate to `github-engineer`:

`inspect → task branch → minimal edits → re-read files → compare → draft PR → verify PR`

The bridge records commit SHA, branch, PR URL/number and verification status.

## Optional Intercom write-back

Only after the GitHub result required by the contract is verified:

1. re-open the exact Intercom object;
2. verify it still matches the prepared snapshot identity/version constraints;
3. apply only the approved fields;
4. re-observe the resulting values/status/version;
5. append evidence.

If the Intercom object changed independently, do not overwrite it from the stale snapshot. Re-run prepare/reconciliation.

## Transaction outcome

- Both required sides verified → `VERIFIED_SUCCESS`.
- GitHub verified but required Intercom write blocked by auth → `PARTIAL_SUCCESS` + `AUTH_REQUIRED` detail.
- Any unverified required mutation → `BLOCKED_UNVERIFIED`.
- Safe compensating action completed and verified → `FAILED_RECOVERED`.
