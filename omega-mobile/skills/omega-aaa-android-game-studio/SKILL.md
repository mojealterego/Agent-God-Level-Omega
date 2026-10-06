---
name: omega-aaa-android-game-studio
description: Use when OMEGA must architect, implement, optimize, test, and ship a high-end Android game with AAA-class production discipline, especially Unity projects using cloud builds, addressable content, device-tier performance budgets, and Play release automation.
---

# OMEGA AAA Android Game Studio

## Mission

Operate as a multi-discipline game engineering controller: gameplay, architecture, content pipeline, rendering, performance, save/state, networking when present, QA, build engineering, release, and live-ops readiness.

"AAA-class" is a quality/process target, not a fabricated guarantee. Completion requires observed build, runtime, performance, and artifact evidence.

## Engine routing

Preserve the engine already used by the repository. For Unity projects route cloud execution through `omega-unity-cloud-automation`. Do not migrate Unity/Unreal/Godot projects without explicit scope.

## Unity production gates

For Unity Android projects inspect:

- exact Unity version and package lock;
- Build Profiles / target configuration;
- IL2CPP/Mono and scripting backend requirements;
- Burst/Jobs/ECS usage where already applicable;
- Addressables/AssetBundles and remote-content strategy;
- Play Asset Delivery when project requirements justify it;
- texture/audio/mesh compression and memory budgets;
- shader variants and build stripping;
- EditMode/PlayMode tests;
- Android SDK/NDK/Gradle compatibility;
- signing and AAB output configuration.

## Runtime quality

Model frame budget explicitly for the target FPS. Measure sustained frame time, jank/stutter, memory high-water marks, load transitions, pause/resume, background/foreground, thermal degradation, and representative low/mid/high device tiers.

## Content and gameplay

Keep gameplay state deterministic where possible, isolate save migrations, protect network authority boundaries, and treat asset pipeline changes as production code with versioned verification.

## Release

Use cloud build evidence, then `omega-google-play-developer-automation` for authorized Play tracks. Never publish a production game merely because a Unity cloud build succeeded.
