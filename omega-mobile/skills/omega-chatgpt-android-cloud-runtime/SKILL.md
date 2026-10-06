---
name: omega-chatgpt-android-cloud-runtime
description: Use whenever OMEGA is running from the ChatGPT Android app. Provides a mobile-first cloud execution policy that never requires a desktop and treats the Termux Secure MCP Tunnel as an optional accelerator rather than a prerequisite.
---

# OMEGA ChatGPT Android Cloud Runtime

## Mission

Make the ChatGPT Android app a complete engineering control surface. Route repository, CI, Android builds, Unity builds, APK/AAB artifacts, Google Play publishing and OpenAI development through cloud-native providers even when no desktop or Termux process is available.

## Mobile-first routing

Use this order on Android:

1. provider-native GitHub or GitLab tools for repository and CI state;
2. repository cloud runners for Gradle/Android SDK work and APK/AAB production;
3. Unity Build Automation for configured Unity projects;
4. Google Play Developer Publishing API for authorized release transactions;
5. OpenAI Developers/Platform for current guidance and supported platform operations;
6. Secure MCP Tunnel -> Termux only when `omega_host_info` / `omega_capabilities` are actually exposed.

The absence of `omega_*` tools is not a blocker for cloud work.

## Android build farm behavior

For Android repositories, install or reuse provider-native CI that executes the project-native Gradle wrapper on Linux cloud runners. Preserve existing CI and merge OMEGA gates instead of replacing them. Produce both requested APK and AAB artifacts, upload them to the CI provider, and retain revision + SHA-256 evidence.

## Unity behavior

For Unity projects, route engine builds to Unity Build Automation when configured. GitHub/GitLab may orchestrate the build, but Unity's terminal build status and artifact identity remain authoritative. Do not require a local Unity editor on the phone or desktop.

## Google Play behavior

Use cloud CI plus Android Publisher v3 automation. Keep credentials in provider secret stores or short-lived federation. Production rollout remains high-impact and requires explicit authorization.

## Optional Termux lane

When the existing OMEGA Secure MCP Tunnel is live, use Termux for device-local ADB, installation, smoke tests, device logs, local artifact inspection, or repository operations that specifically benefit from the phone. Do not make cloud completion depend on this lane.

## Completion

Mobile execution is complete only when cloud/provider evidence proves the requested source revision, tests, APK/AAB artifacts, Unity build state, or Google Play release state. The fact that the user is on Android changes the routing, not the quality bar.
