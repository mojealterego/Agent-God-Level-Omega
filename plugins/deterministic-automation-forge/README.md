# Automation Forge 0.4.0

Automation Forge is a private execution control-plane for controlled automation between Intercom, GitHub, GitHub Codespaces, developer/cloud/AI services, and browser-accessible web applications.

## Execution model

`DISCOVER → BIND → AUTH → PLAN → PRECHECK → EXECUTE → VERIFY → COMMIT | COMPENSATE → AUDIT`

The plugin does not treat a model statement as proof. Each write must produce a mutation receipt and must be followed by an independent read/re-observation of the changed target. If a required postcondition cannot be observed, the run is blocked or recovered rather than reported as successful.

## Runtime bindings

Automation Forge uses host-provided tools when available:

- GitHub connector for structured repository operations.
- Web search for current public discovery and validation.
- Authenticated browser automation for dynamic websites and account-level settings when no structured connector exists.
- Browser Context Profiles or other host-managed credential/session facilities for session state. Credentials are never stored in public repository source.

The plugin does not invent remote MCP endpoints or embed passwords, OTPs, session cookies, payment-card data, or private signup identity data. A connector must actually be present in the host before its binding is considered active.

## Main roles

- `automation-control-plane` — state machine, contracts, locking and routing.
- `runtime-executor` — capability discovery and exact host-tool binding.
- `heimdall-reward-scout` — Asgard watcher for new developer/cloud/AI bonus programs, safe account onboarding, verification, and handoff into full site automation.
- `intercom-operator` — Intercom reconnaissance and mutations.
- `intercom-github-bridge` — evidence-preserving Intercom ↔ GitHub handoff.
- `github-engineer` — branch/PR-safe repository implementation.
- `codespaces-host-image-operator` — Stable/Beta host-image preference, compatibility analysis and rollback discipline.
- `site-registrar` — adds authenticated websites through a read-only certification step.
- `web-operator` — generic authenticated browser execution.
- `verifier-auditor` — independent verification and evidence ledger.
- `recovery-agent` — reconciliation, compensation and retry discipline.
- `throughput-optimizer` — safe parallel reads and independent work.

## Heimdall reward discovery and onboarding

Heimdall supports two entry modes:

- `USER_SEED`: the user supplies a service or signup URL.
- `WEEKLY_SCOUT`: discover newly available developer/cloud/AI/SaaS services with meaningful signup credits, grants, free compute, or startup benefits, then validate them from current official sources.

For an eligible candidate Heimdall:

1. verifies the official domain, offer status, region/eligibility, expiration, payment requirements, and anti-abuse constraints;
2. deduplicates against observed existing sessions/accounts when possible;
3. attempts at most one legitimate account per service using only user-approved identity data supplied privately at runtime;
4. never fabricates eligibility, creates duplicate accounts, bypasses CAPTCHA/KYC/2FA, self-refers, or evades promo limits;
5. stops before payment-card entry, paid subscription, paid trial/auto-renewal, regulated financial/crypto/gambling signup, or identity verification unless separately authorized and supported;
6. verifies successful account creation by re-observing the resulting account/dashboard state;
7. hands the authenticated service to `site-registrar`, which builds a verified SiteAdapter;
8. hands certified operations to `web-operator` for repeatable automation.

If secure credential storage is unavailable and the site requires a persistent password, Heimdall returns `SECRET_STORAGE_REQUIRED` instead of placing a password in chat, source control, logs, or an evidence ledger.

## GitHub Codespaces host image

Automation Forge treats the Codespaces VM host image and the dev-container image as separate configuration layers.

- Stable is the default recommendation for reliability-sensitive workflows.
- Beta is used deliberately for early compatibility testing or access to host-level improvements.
- If GitHub exposes no beta host image, a Beta preference may still result in a Stable-hosted codespace; the operator records the observed effective state rather than assuming Beta was used.
- A host-image preference change is an account-level GitHub setting, not a repository commit.

## Important limitation

This plugin is an execution policy/control layer. Persistent recurring execution requires a supported scheduler/automation surface. Individual websites may still require a human step for CAPTCHA, OTP/2FA, consent, identity verification, or payment. Heimdall reports the exact blocker and does not falsely mark the signup as complete.
