---
name: omega-asgard-account-tunnel
description: Use when ASGARD must isolate and route work across multiple Gemini, ChatGPT, GitHub or other authorized account profiles without mixing secrets, sessions, quotas, provenance or project affinity.
---

# ASGARD Account Tunnel Broker

Treat "tunneling" as account/session multiplexing, not geographic VPN evasion. Each account is an explicit profile with its own transport, authorization state, secret reference or host profile reference, health, concurrency budget, scopes and provenance.

## Procedure

1. Register profiles with `account-register`, or create numbered slots with `account-bootstrap`.
2. Store only `secretEnvRef`, `profileRef`, `connectorRef` and metadata. Never store passwords, API keys, OAuth refresh tokens or raw credentials in ASGARD state.
3. For Gemini, prefer one environment variable per account, for example `GEMINI_API_KEY_1` through `GEMINI_API_KEY_7`. Route projects with session affinity so continuations use the same account while it remains healthy.
4. For ChatGPT accounts, register `HOST_PROFILE` entries. They are routing metadata only; actual host-account switching requires a real host/session interface and must never be silently claimed.
5. For GitHub, isolate accounts with separate `GH_CONFIG_DIR` profiles or secret env references. Do not mutate a shared global auth profile unless explicitly authorized.
6. Use health, priority and concurrency to route new work. Failed accounts may be degraded or cooled down without affecting other accounts.
7. Preserve account ID in evidence and result metadata so outputs from different identities are never conflated.
8. If no eligible account has real authentication, fail closed instead of inventing a provider result.

## Security invariants

- Raw secret fields are rejected.
- Persisted state contains references only.
- Account health and routing decisions are observable.
- Geographic VPN is not required for Gemini use in supported regions; this layer exists for isolation and scale across many accounts.
- Provider terms, rate limits and account policies still apply independently to every profile.

See `../../references/account-tunneling-v18.md` and `../../schemas/account-profile-v18.schema.json`.
