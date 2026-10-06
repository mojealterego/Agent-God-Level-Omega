# Unity Cloud Automation Reference

OMEGA v3.3 uses Unity Build Automation v2 as the authoritative mutable cloud-build lane for configured Unity projects.

Authoritative base URL:

`https://build-automation.services.api.unity.com/v2`

Implemented client operations:

```text
POST   /orgs/{org}/projects/{project}/buildtargets/{target}/builds
GET    /orgs/{org}/projects/{project}/buildtargets/{target}/builds/{number}
DELETE /orgs/{org}/projects/{project}/buildtargets/{target}/builds/{number}
```

Authentication uses Unity service-account HTTP Basic authentication. OMEGA keeps key id/secret material in provider-native secret stores and redacts them from output.

For Android targets, Build Automation can be configured for APK or AAB, release signing, tests, Addressables, and scheduled/automatic builds. OMEGA treats the Unity build target configuration and exact build number as provider evidence, then hands verified Android artifacts to downstream device or Google Play gates when the task requires it.
