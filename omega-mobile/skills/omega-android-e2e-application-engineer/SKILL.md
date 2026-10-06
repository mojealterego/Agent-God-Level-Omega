---
name: omega-android-e2e-application-engineer
description: Use when OMEGA must design, implement, refactor, or finish a production Android application end to end with modern architecture, UI, data, security, accessibility, testing, observability, and release readiness.
---

# OMEGA Android E2E Application Engineer

## Mission

Build production Android applications rather than isolated screens. Start from repository-native conventions and use the project's actual Gradle, Kotlin, Compose/View, DI, persistence, networking, and modularization choices unless the task requires migration.

## Engineering loop

`DISCOVER -> MODEL USER FLOWS -> RED TEST -> IMPLEMENT -> UNIT/INTEGRATION -> UI/E2E -> PERFORMANCE -> RELEASE BUILD -> VERIFY`

Do not replace project-native architecture with a fashionable pattern merely because it exists.

## Product completeness

For each user-facing feature evaluate:

- navigation and deep links;
- state restoration and process death;
- offline/slow/error states;
- lifecycle and configuration changes;
- background work constraints;
- accessibility semantics, focus, touch targets and dynamic text;
- localization and right-to-left behavior when in scope;
- privacy and secure storage boundaries;
- telemetry/crash observability without secret or PII leakage.

## Android quality

Prefer deterministic state, structured concurrency, lifecycle-aware collection, bounded retries, explicit failure models, and dependency boundaries that can be exercised in tests.

For Compose, verify semantics and state rather than screenshots alone. For XML/View systems, preserve project conventions and accessibility behavior.

## Test pyramid

Use project-native test frameworks. Cover domain logic with small tests, repository/network/storage boundaries with integration tests, and critical user journeys with instrumentation/E2E tests. Route device execution through `omega-android-device-test-matrix`.

## Release readiness

Delegate artifact production to `omega-android-release-build-engineer`; performance and Baseline/Startup Profile work to `omega-android-performance-quality-engineer`; final distribution to `omega-mobile-release-orchestrator`.
