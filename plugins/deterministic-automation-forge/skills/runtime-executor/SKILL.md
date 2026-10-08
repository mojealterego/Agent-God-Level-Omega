---
name: runtime-executor
description: Discover and bind the exact host tools needed by an Automation Forge job, verify authentication state, execute tool calls according to the job contract, and return machine-checkable receipts for independent verification.
---

# Runtime Executor

Use before any external read/write and whenever tool availability may have changed.

## Capability binding

For every requested step create a `RuntimeBinding` containing:

- `system`
- `capability`
- `tool_name`
- `auth_state`: `CONFIRMED`, `REQUIRED`, `UNKNOWN`, or `NOT_APPLICABLE`
- `target_scope`
- `verification_tool`
- `fallback_policy`

A binding is valid only if the tool is actually exposed in the current host.

## Authentication and signup gate

### GitHub repository operations

A successful structured repository read against the exact intended repository is evidence that the connector can access that repository. Do not infer write permission from read permission; let the write call enforce authorization and verify the resulting state.

### GitHub account settings / Codespaces preference

Repository authorization is not evidence that account-level settings can be changed. Bind a dedicated account-setting capability when available; otherwise use authenticated browser automation and verify the preference after the write.

### Browser applications

For an existing protected account, prefer a browser profile/session whose recorded signed-in sites cover the target domain. If coverage is absent, return `AUTH_REQUIRED` rather than launching blind authenticated mutations.

For new-account onboarding, `heimdall-reward-scout` may begin unauthenticated on the official signup origin, but must bind a secure path for any credential that must persist. If the host cannot safely generate/store the required password or complete a passwordless/OAuth flow already authorized by the user, return `SECRET_STORAGE_REQUIRED`.

Never place passwords, OTPs, session cookies, payment-card data, or identity documents in ordinary logs, source control, or evidence output.

## Execution receipt

Every call that affects the job returns a normalized receipt:

```yaml
runtime_receipt:
  step_id: string
  tool_name: string
  target: string
  operation: string
  mutation: boolean
  returned_ids: []
  returned_urls: []
  returned_version_or_sha: string|unknown
  terminal_state: string
  verification_required: true|false
```

Do not interpret the mutation receipt as verification of user-visible state when an independent read is available.

## Browser-run discipline

After starting browser automation:

1. persist the returned run ID in the job state;
2. call the supported wait operation with that same run ID until terminal;
3. if waiting times out/errors, retry the wait operation, not the original browser mutation;
4. after terminal completion, independently inspect the target state when the contract requires it.
