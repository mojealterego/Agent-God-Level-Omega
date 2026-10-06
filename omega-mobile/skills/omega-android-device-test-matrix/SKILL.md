---
name: omega-android-device-test-matrix
description: Use when Android acceptance requires instrumentation, UI, compatibility, smoke, or E2E verification across connected devices, emulators, Gradle Managed Devices, or another actually available device-lab provider.
---

# OMEGA Android Device Test Matrix

## Mission

Prove critical Android journeys on observed runtime targets instead of inferring device behavior from JVM tests.

## Available lanes

Rank lanes by evidence and task fit:

1. connected physical Android device through OMEGA MCP/ADB;
2. project-configured Gradle Managed Devices;
3. configured cloud device-lab provider if actually exposed;
4. local emulator when the host has a usable emulator runtime.

Do not claim a device matrix merely because an emulator definition exists.

## Matrix dimensions

Select only dimensions that materially affect acceptance:

- min/target/current API levels;
- phone/tablet/foldable form factors;
- portrait/landscape;
- low-memory or constrained tier;
- dark/light theme;
- locale and font scale;
- network offline/slow/error paths;
- GPU/rendering tier for games.

## Execution

Use `mobile/android/android_pipeline.py` for connected or repository-defined managed-device tasks when suitable. Preserve screenshots, JUnit/XML/HTML test reports, logcat excerpts, traces, and crash evidence as artifacts without leaking secrets.

## Failure rule

A flaky test is not success. Reproduce, classify timing/external-state dependencies, remove nondeterminism, and rerun on the same revision before expanding the matrix.
