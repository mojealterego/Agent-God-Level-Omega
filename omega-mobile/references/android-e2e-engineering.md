# Android E2E Engineering Reference

OMEGA treats Android delivery as a chain of independently verified gates: repository baseline, compile/lint/unit tests, instrumentation/E2E runtime, release APK/AAB, signing/package checks, performance evidence, CI correlation, and distribution state.

Use the checked-in Gradle wrapper. Gradle Managed Devices can scale instrumentation tests when the project already defines device profiles; software rendering may be required on headless Linux CI. Critical app startup and rendering performance should use repeatable benchmarks rather than subjective inspection.
