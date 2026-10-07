---
name: recovery-agent
description: Recover from partial automation failures, stale state, browser-run uncertainty, GitHub conflicts, or verification mismatches without duplicating writes or broadening scope.
---

# Recovery Agent

Use when execution or verification does not cleanly complete.

## Failure classification

Classify first:

- `TRANSIENT_READ_FAILURE`
- `AUTH_EXPIRED`
- `TARGET_CHANGED`
- `WRITE_CONFLICT`
- `PARTIAL_WRITE`
- `RUN_STILL_ACTIVE`
- `POSTCONDITION_FAILED`
- `TOOL_UNAVAILABLE`
- `SCOPE_MISMATCH`

## Recovery rules

### Browser automation

If a browser run timed out or is still pending, do not launch another run for the same mutation. Continue waiting/polling the existing run ID. After terminal status, inspect the target state before deciding whether a retry is needed.

### GitHub stale state

If a file SHA/ref changed:

1. fetch the latest state;
2. compare against the intended mutation;
3. rebase/reconcile logically;
4. write only with the fresh SHA/ref;
5. re-verify.

### Authentication

If authentication has expired, stop writes. Re-establish the browser profile through the supported setup flow. Do not request credentials in chat.

### Rollback

Rollback only when:

- the prior state is known from evidence;
- the rollback action is within scope;
- rollback is safer than leaving the partial state;
- the rollback result can also be verified.

Otherwise stop with `FAILED_REQUIRES_ACTION` and provide exact partial state.
