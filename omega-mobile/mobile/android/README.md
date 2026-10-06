# OMEGA Android E2E Pipeline

`android_pipeline.py` is a shell-free helper for repository-native Gradle builds.

Examples:

```bash
python3 mobile/android/android_pipeline.py plan --module app --variant release --e2e-mode none
python3 mobile/android/android_pipeline.py run --module app --variant release --e2e-mode connected --test-variant debug
python3 mobile/android/android_pipeline.py run --module app --variant release --e2e-mode managed --managed-task pixel8Api35DebugAndroidTest
python3 mobile/android/android_pipeline.py artifacts
```

The generic build plan executes lint, unit tests, release APK assembly and release AAB bundling. Connected or Gradle Managed Device E2E execution is opt-in because the actual repository defines the available device tasks.

The helper validates module/variant/task names, never executes via `shell=true`, applies per-command timeouts, terminates process groups on timeout, and emits SHA-256 metadata for discovered APK/AAB outputs.
