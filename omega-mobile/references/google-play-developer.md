# Google Play Developer Automation Reference

OMEGA uses the Android Publisher v3 edit transaction model: create an edit, upload an APK/AAB, update a track, validate, then commit. Validation-only runs delete the temporary edit to avoid leaving stale edits open.

Production rollout is separately guarded. Prefer Application Default Credentials backed by short-lived workload identity. Never store Play credentials in the plugin or repository.
