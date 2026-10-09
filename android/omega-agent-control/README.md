# OMEGA Agent Control — native Android
An operational native Android UI for the working OIDC-backed THOR GitHub executor. Unlike the earlier Canvas APK, this is a task-control app.
It creates validated `[THOR-PROJECT] <web|android|game|api> <slug>` issue drafts in the device's **system browser** (user must press Submit), lists recent public GitHub Actions workflow statuses, and links to run artifacts and Pull Requests.
No passwords, access tokens, API keys or user secrets are ever requested by this app. All network traffic uses HTTPS.
`gradle --no-daemon assembleDebug` requires Android SDK 35, AGP 8.7.3, Gradle 8.9 and Java 17.
This app **does not** contain an independent on-device LLM, automated AAA game production, or APK installation instrumentation. APK compilation should be verified in CI.
