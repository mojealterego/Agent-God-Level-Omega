---
name: omega-asgard-kratos-security-signing
description: Use Kratos for API-key governance, secret references, Android/Google Play signing, release-security checks and monetization credential boundaries without persisting or exposing raw secret values inside OMEGA state.
---

# Kratos — Security, Secrets and Signing

Kratos protects credentials and release identity. Its persistent state contains references such as environment-variable names or approved file locations, never secret values.

## Procedure

1. Before storing configuration, call `kratos-secret-check`. Reject inputs containing raw API keys, passwords, tokens or private keys where references can be used instead.
2. Register credentials with `kratos-secret-register` using `envRef` or `fileRef`. Keep provider and rotation metadata separate from the value.
3. Register Android signing metadata with `kratos-signing-register`. Passwords must be referenced by environment-variable name.
4. Use `kratos-signing-doctor` to verify the presence of actual `apksigner`, `keytool` and related toolchains. Missing tools are `UNAVAILABLE`, not success.
5. `kratos-sign-apk` requires explicit approval, an existing APK inside the workspace, a registered signing profile and available password environment variables. The command uses `env:` password references rather than plaintext arguments.
6. Use `kratos-monetization-plan` for security requirements around AdMob, subscriptions and in-app purchases; no production IDs or credentials are fabricated.
7. Google Play publication remains dependent on a real Play Console/API connector and account authorization.

Do not print, log, package or commit secret values. Rotate compromised credentials outside the plugin through the authoritative provider.
