# Freyr Cloud Funding — OMEGA v21

Freyr converts Ragnar/Loki market discoveries into a controlled onboarding pipeline for cloud/startup programs.

## State model

`DISCOVERED → VERIFIED_CURRENT → QUALIFIED → PLANNED → APPROVAL_REQUIRED | READY → ACCOUNT_CREATED → AUTOMATION_CONFIGURED → ACTIVE`

Possible blockers include:

- `PROGRAM_NOT_VERIFIED`
- `PROGRAM_EXPIRED`
- `REGION_NOT_ELIGIBLE`
- `PROFILE_FIELD_REQUIRED:*`
- `ACCOUNT_BINDING_REQUIRED`
- `CONNECTOR_ACCOUNT_MISMATCH`
- `TERMS_APPROVAL_REQUIRED`
- `CAPTCHA_REQUIRED`
- `KYC_REQUIRED`
- `PHONE_VERIFICATION_REQUIRED`
- `PAYMENT_METHOD_APPROVAL_REQUIRED`
- `LEGAL_ATTESTATION_REQUIRED`
- `AUTHORIZED_SIGNUP_ADAPTER_REQUIRED`

Freyr never treats provider discovery as proof of current eligibility. Evidence and `verifiedAt` are required before a program can be considered current.

## Provider automation

Signup execution is restricted to real authorized transports:

- `MCP_FEDERATION` — may execute when the provider exposes a real signup operation and all blockers are cleared.
- `HOST_BROWSER` / `HOST_CONNECTOR` — represented as host orchestration boundaries; the local MCP runtime does not pretend to click web flows by itself.

Post-onboarding integration is delegated to Kratos, Ragnar and Thor: secret references, account tunnel profile, CLI/API/MCP discovery, automation generation, health/security verification.
