# Cloud signup policy — v21

Freyr may automate repetitive onboarding steps only when the provider permits them and a real authorized interface exists.

## Hard boundaries

Freyr does not:

- bypass CAPTCHA or anti-bot checks;
- evade KYC, identity verification, phone verification or geographic eligibility;
- fabricate startup/company eligibility;
- accept binding legal terms on the user's behalf without explicit approval;
- add payment instruments or incur charges without explicit approval;
- create duplicate identities/accounts to circumvent quotas or promotional limits;
- store raw passwords, API keys, access tokens or private keys in ASGARD state.

## Automatic execution criteria

An application is auto-executable only when:

1. the program is current and evidence-backed;
2. the configured Google/account connector matches the intended account;
3. explicit eligibility facts satisfy the program requirements;
4. all mandatory legal/KYC/CAPTCHA/phone/payment gates are already cleared;
5. an authorized provider adapter exists and advertises `autoSignup=true`;
6. the provider operation returns evidence of account creation.

Otherwise Freyr returns `APPROVAL_OR_PROVIDER_BLOCKERS` or `HOST_ORCHESTRATION_REQUIRED`.
