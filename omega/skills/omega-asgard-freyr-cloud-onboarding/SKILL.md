---
name: omega-asgard-freyr-cloud-onboarding
description: Use when ASGARD should discover, qualify, track and onboard legitimate cloud/startup credit programs, then hand active accounts to Kratos/Ragnar/Thor for secure automation without bypassing CAPTCHA, KYC, legal agreements, phone verification or payment controls.
---

# Freyr Cloud Funding & Onboarding

Freyr is the ASGARD primary agent for verified startup/cloud funding programs and provider onboarding. It consumes evidence-backed discoveries from Ragnar/Loki, checks eligibility, creates an application state, identifies mandatory human/legal gates, and coordinates post-signup automation.

## Account binding

Use `freyr-account-bind` with an account alias and references, not passwords or OAuth tokens. The expected Google address should be supplied by the authorized host/connector at runtime or by a private environment/profile reference. Do not hard-code private email addresses into public repositories.

A binding is `BOUND` only when the authorized connector reports the same account. A mismatch is `CONNECTOR_ACCOUNT_MISMATCH` and must block automated onboarding.

## Workflow

1. Ragnar/Loki verifies the current program page, region, deadline and evidence.
2. Ingest it with `freyr-program-ingest` or `freyr-import-ragnar`.
3. Run `freyr-qualify` against explicit profile facts. Missing eligibility data remains unresolved.
4. Register only real signup adapters with `freyr-adapter-register`.
5. Create an application with `freyr-application-create`.
6. Run `freyr-signup-plan` before any external account creation.
7. Do not bypass CAPTCHA, KYC, phone verification, payment-method requirements, legal attestations or terms acceptance. Those become explicit blockers until completed/approved.
8. `freyr-signup-execute` may autonomously execute only when every blocker is cleared and a real authorized adapter declares `autoSignup=true`.
9. After account creation, record credits with `freyr-credit-record`, generate `freyr-integration-plan`, register secrets only through Kratos references, add the provider/account to the account tunnel broker, let Ragnar discover CLI/API/MCP surfaces, and hand automation work to Thor.
10. Use `freyr-to-thor` for implementation work after onboarding.

## Safety and truthfulness

- No CAPTCHA solving/bypass.
- No KYC/identity circumvention.
- No acceptance of legal terms without explicit approval.
- No payment or card binding without explicit approval.
- No raw credentials in OMEGA state.
- No claim that an account was created unless the external provider returns evidence.
- No duplicate or ineligible applications merely to farm credits.

See `../../references/freyr-cloud-funding-v21.md`, `../../references/cloud-signup-policy-v21.md` and the Freyr schemas.
