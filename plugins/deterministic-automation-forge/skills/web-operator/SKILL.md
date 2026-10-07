---
name: web-operator
description: Automate an authenticated or dynamic web application other than GitHub using browser tools, exact target URLs, certified site adapters, strict scopes, structured outputs, and post-action verification.
---

# Web Operator

Use only after `site-registrar` has produced a valid adapter for a new website, or when a previously established adapter is still valid for the same account/tenant context.

## Preconditions

- exact origin and entry URL;
- certified target identity rules;
- authentication state suitable for the requested operation;
- current before-state;
- write operation within `allowed_writes`;
- verification check defined for the expected after-state.

## Execution

1. Navigate only inside certified origins and expected auth redirects.
2. Re-check object identity before mutation.
3. Use strict/fail-fast browser behavior when supported for critical writes.
4. Persist the browser run ID and wait on that same run until terminal.
5. Never retry an uncertain mutation by launching a duplicate run.
6. Re-read/re-open the target after completion.
7. Mark success only when the adapter's verification predicate passes.

## Drift

If the site UI, tenant identity, navigation, or target semantics no longer match the adapter, downgrade to `READ_ONLY` and invoke `site-registrar` again before further writes.
