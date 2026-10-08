# Heimdall Signup Policy

## Scope

Heimdall is for legitimate developer/cloud/AI/SaaS account onboarding and reward discovery. It is not a multi-account or promotion-abuse system.

## Non-negotiable rules

- One legitimate account per provider unless the provider explicitly supports multiple organizations/workspaces under one identity.
- No duplicate accounts to repeat a new-user bonus.
- No fabricated company, funding, student, geography, referral, investment, or prior-customer claims.
- No CAPTCHA bypass, OTP interception, KYC evasion, fake identity, disposable identity rotation, or anti-fraud circumvention.
- No automatic payment-card/bank entry, paid plan, paid trial, auto-renewal, or purchase without separate explicit authorization.
- No regulated financial/crypto/gambling reward harvesting.
- No passwords, OTPs, session cookies, payment credentials, or identity documents in public repositories or ordinary logs.

## Evidence schema

```yaml
heimdall_candidate:
  service: string
  official_origin: string
  discovery_mode: USER_SEED|WEEKLY_SCOUT
  offer_summary: string
  offer_source: string
  checked_at: string
  eligibility: ELIGIBLE|INELIGIBLE|UNKNOWN
  region_requirement: string|unknown
  payment_requirement: NONE|CARD|PAID_PLAN|UNKNOWN
  existing_account_state: NONE_OBSERVED|EXISTS|UNKNOWN
  signup_state: NOT_STARTED|IN_PROGRESS|USER_ACTION_REQUIRED|ACCOUNT_VERIFIED|BLOCKED
  blocker: string|none
  site_adapter_state: NOT_STARTED|READ_ONLY|WRITE_ENABLED|BLOCKED
  evidence: []
```

## Weekly discovery output

For each run, report:

- newly discovered verified offers;
- materially changed offers;
- rejected/expired/unverified claims;
- accounts successfully verified;
- accounts requiring user action;
- adapters created/certified;
- exact blockers.

Do not report an account as created merely because a signup form was submitted.
