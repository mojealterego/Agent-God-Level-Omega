---
name: site-registrar
description: Certify a new authenticated browser-accessible website for Automation Forge by performing read-only reconnaissance, establishing exact domain/account/target rules, defining allowed mutations and verification checks, and enabling writes only after the adapter contract is complete.
---

# Site Registrar

Use after authentication exists for a new website, including accounts created by `heimdall-reward-scout`, and before the first operational write against a site without a verified adapter in the current job context.

## Stage 1 — Bind and authenticate

- resolve the canonical origin and exact entry URL;
- bind browser automation;
- inspect available authenticated session/profile state when authentication is required;
- if session coverage cannot be confirmed, return `AUTH_REQUIRED`.

## Stage 2 — Read-only reconnaissance

Run a read-only browser session. Extract:

- canonical domain/origin;
- tenant/workspace/account identifier visible in URL/UI;
- object identifiers and navigation path;
- stable labels/controls relevant to the requested workflow;
- current values needed for preconditions;
- publish/save semantics;
- destructive controls and confirmation steps;
- evidence available after a write.

No operational mutation is allowed during certification.

## Stage 3 — Adapter contract

Create a `SiteAdapter` with:

- exact origins and expected auth redirects;
- account/tenant identity rules;
- allowed read and write actions;
- forbidden/destructive actions;
- target identity rules;
- verification checks;
- retry/idempotency policy;
- compensation/recovery actions.

## Stage 4 — Certification

An adapter is `WRITE_ENABLED` only when:

1. target identity is unambiguous;
2. authentication is confirmed when required;
3. before-state can be observed;
4. after-state can be independently observed;
5. destructive boundaries are explicit;
6. retry behavior cannot silently duplicate the intended mutation.

Otherwise it remains `READ_ONLY` or `AUTH_REQUIRED`.
