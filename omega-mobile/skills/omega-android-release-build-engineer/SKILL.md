---
name: omega-android-release-build-engineer
description: Use when Android work must produce, sign, inspect, and verify release APK/AAB artifacts through Gradle or Unity, including deterministic build commands, versioning, shrinker checks, artifact hashes, and signing safety.
---

# OMEGA Android Release Build Engineer

## Mission

Turn a verified Android revision into installable APK and publishable AAB artifacts with evidence.

## Native Android lane

Use the checked-in Gradle wrapper and repository-native variant/flavor naming. The packaged helper can construct and run bounded generic plans:

```text
mobile/android/android_pipeline.py
```

It covers lint, unit tests, `assemble<Variant>`, `bundle<Variant>`, optional connected/managed-device instrumentation, and SHA-256 artifact manifests.

Do not assume module `app` or variant `release` when repository state says otherwise.

## Unity lane

For Unity Android games, prefer configured Unity Build Automation when it is the project's cloud authority. Verify that the Android target is configured for APK or AAB as required and that signing credentials are held by Unity's credential store or another approved secret store.

## Signing invariants

Never commit keystores, key passwords, upload-key material, Play service-account JSON, or signing secrets. Observe signing configuration without exfiltrating secret values.

When available, verify APK signatures with `apksigner` and validate AAB structure with `bundletool` or equivalent project-native tooling.

## Shrinking and packaging

For release variants inspect R8/minification/resource shrinking, consumer rules, native debug-symbol handling, ABI splits, Play Asset Delivery or dynamic features when present. Do not silently disable a shrinker to make a broken build pass.

## Artifact gate

A build is complete only when the requested `.apk`/`.aab` files are found, non-zero, revision-correlated, hashed, and retained as CI or local artifacts.
