# OMEGA Unity Cloud Automation

This lane uses Unity Build Automation v2 directly from cloud CI runners and does not require the Android/Termux runtime to be online.

## Required non-secret variables

- `UNITY_ORG_ID`
- `UNITY_PROJECT_ID`
- `UNITY_BUILD_TARGET_ID`

## Required secrets

- `UNITY_SERVICE_ACCOUNT_KEY_ID`
- `UNITY_SERVICE_ACCOUNT_SECRET`

Store credentials only in the provider secret store (GitHub Actions secrets, GitLab masked/protected variables, or an equivalent secret manager). Never commit them to a repository or plugin package.

## Commands

```bash
python3 cloud/unity/unity_build_automation.py trigger --branch main --wait
python3 cloud/unity/unity_build_automation.py status 42
python3 cloud/unity/unity_build_automation.py wait 42
python3 cloud/unity/unity_build_automation.py cancel 42
```

The client uses the official Unity Build Automation v2 endpoint:

`https://build-automation.services.api.unity.com/v2`

Unity Android build targets may be configured for APK/AAB, release signing, EditMode/PlayMode tests, Addressables, caching, automatic builds and schedules. Those target settings remain provider-side; OMEGA never copies signing secrets into CI or chat.

## Provider templates

- GitHub Actions: `cloud/github/omega-unity-cloud.yml`
- GitLab CI: `cloud/gitlab/omega-unity-cloud.yml`

These templates are references. OMEGA must inspect the target repository's existing CI before installation and merge rather than overwrite unrelated pipelines.
