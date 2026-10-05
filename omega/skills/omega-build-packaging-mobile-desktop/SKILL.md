---
name: omega-build-packaging-mobile-desktop
description: Use when preparing or executing real build steps for Android packages or planning desktop installer toolchains.
---

# Build and Packaging

`build-plan` returns canonical release commands for Android APK (`./gradlew assembleRelease`) and AAB (`./gradlew bundleRelease`) and enumerates external toolchains for MSI, EXE and DMG packaging. `build-execute` can execute only plans with a concrete command through the normal OMEGA process policy and workspace sandbox; it does not fabricate an artifact when Gradle or the project wrapper is missing. Desktop MSI/EXE/DMG creation remains provider/toolchain dependent (WiX/wixl/NSIS, `hdiutil/pkgbuild/productbuild`, etc.). Always inspect the resulting artifact hash and run project tests/signing checks separately. This module does not bypass platform signing, notarization, keystores or store review requirements.