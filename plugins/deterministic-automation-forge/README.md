# Automation Forge 0.4.0

Automation Forge is a private execution control-plane for controlled automation between Intercom, GitHub, GitHub Codespaces, developer/cloud/AI services, and browser-accessible web applications.

## Execution model

`DISCOVER → BIND → AUTH → PLAN → PRECHECK → EXECUTE → VERIFY → COMMIT | COMPENSATE → AUDIT`

## Main roles

- `automation-control-plane` — state machine, contracts, locking and routing.
- `runtime-executor` — capability discovery and exact host-tool binding.
- `heimdall-reward-scout` — Asgard watcher for current developer/cloud/AI/SaaS reward programs, legitimate account onboarding, verification, and handoff into full site automation.
- `site-registrar` — authenticated site certification.
- `web-operator` — repeatable post-signup automation.
- `recovery-agent` — reconciliation and blocker handling.

## Heimdall

Heimdall supports `USER_SEED` and `WEEKLY_SCOUT`.

For eligible services it verifies the official domain and current offer, checks eligibility and existing-account state, attempts at most one legitimate signup using runtime-only user-approved identity, verifies the resulting account state, then hands the authenticated service to `site-registrar` and `web-operator`.

Private signup identity, passwords, OTPs, session cookies, payment-card data and identity documents are never committed to public repository source. Human verification, paid plans, payment instruments, or provider identity checks stop with an explicit blocker instead of being reported as success.

## Important limitation

Persistent recurring execution requires a supported scheduler/automation surface. Website-specific human verification may still require user action.
