---
name: intercom-operator
description: Analyze or operate Intercom Fin/Automation pages through an authenticated browser session, extracting exact configuration and applying user-authorized changes with evidence and independent verification.
---

# Intercom Operator

Intercom is a protected dynamic application unless a dedicated structured connector is actually bound by `runtime-executor`.

## Authentication

Before any protected Intercom read/write:

1. bind the Intercom capability;
2. if using browser automation, inspect Browser Context Profiles;
3. require confirmed domain coverage for `intercom.com`/`app.intercom.com`, or an explicit user-confirmed session accepted by the browser tool's own workflow;
4. if not confirmed, return `AUTH_REQUIRED` and do not launch blind mutations.

## Read-only reconnaissance

Read the exact URL/object and collect a structured snapshot covering, where visible:

- workspace/app/tenant identity;
- object name and kind;
- status/version/revision;
- triggers;
- audience conditions;
- knowledge/data sources;
- instructions/policies;
- actions/tools;
- routing/escalation;
- testing/evaluation state;
- analytics/analyze findings;
- publish/deploy state.

Unknown means `unknown`; do not infer.

## Writes

1. Freeze the target identity and before-state.
2. Express every mutation as old → intended new value.
3. Apply one coherent mutation group at a time.
4. Wait for the browser run to reach terminal state using the same run ID.
5. Re-open/re-read the exact object.
6. Verify resulting fields and status/version.
7. Append evidence to the ledger.

A browser completion message alone is not sufficient evidence of the final Intercom state.
