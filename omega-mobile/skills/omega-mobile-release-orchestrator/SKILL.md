---
name: omega-mobile-release-orchestrator
description: Use for end-to-end Android application or Android game delivery where OMEGA must coordinate architecture, implementation, tests, cloud CI, APK/AAB builds, Unity automation, device verification, and Google Play release evidence.
---

# OMEGA Mobile Release Orchestrator

## Mission

Carry an Android product from observed repository state to a verified distributable artifact and, when explicitly authorized, a Google Play track release. This is the mobile-specialized controller beneath `omega-omni-orchestrator`.

## Routing graph

```text
repository baseline
  -> app or game classification
  -> implementation agent
  -> static/unit quality gates
  -> APK + AAB release build
  -> E2E/device matrix
  -> performance/security gates
  -> artifact verification
  -> cloud CI evidence
  -> Google Play validation/release
```

For ordinary Android applications route implementation through `omega-android-e2e-application-engineer`. For Unity/AAA-class game work route through `omega-aaa-android-game-studio` and `omega-unity-cloud-automation`.

## Required mobile predicates

Before completion prove all predicates requested by the task:

- target repository and branch are unchanged except for intended edits;
- project-native compile/lint/unit tests pass;
- requested E2E/instrumentation tests pass on an observed device/emulator lane;
- release APK and/or AAB exists, is non-empty, and has SHA-256 evidence;
- signing/package verification is observed when the necessary verifier is available;
- performance gates requested by the project are measured rather than inferred;
- cloud CI corresponds to the exact source revision;
- Play release state, when requested, is confirmed by Google Play Developer API evidence.

## Authority split

Use GitHub/GitLab for repository and CI state, Unity Build Automation for configured Unity cloud builds, OMEGA Termux MCP for local Android/ADB/device work, and Google Play Developer API automation for track releases.

Never make one provider's success stand in for another provider's acceptance criterion.

## Release safety

A production Google Play rollout is high-impact. Do not infer authorization from a successful internal/beta upload. Production promotion requires explicit task intent and the production guard in `omega-google-play-developer-automation`.

## Completion

Source code without the requested APK/AAB is incomplete. A built artifact without requested E2E evidence is incomplete. An uploaded bundle without verified track state is incomplete.


## ChatGPT Android runtime

When the host is the ChatGPT Android app, load `omega-chatgpt-android-cloud-runtime`. Cloud provider lanes remain first-class even when local stdio or tunnel tools are absent.
