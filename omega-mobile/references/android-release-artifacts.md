# Android Release Artifact Reference

APK is the installable package format. Android App Bundle (AAB) is the preferred Google Play upload artifact for modern releases. OMEGA can produce both when the project exposes the corresponding Gradle/Unity build path.

Release artifacts must be non-empty, revision-correlated, hashed, and retained. Signing material is never embedded in OMEGA. Verify APK signatures and AAB/package structure when the required tools are present.
