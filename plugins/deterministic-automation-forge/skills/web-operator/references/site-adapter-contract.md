# Site Adapter Contract

```yaml
site_adapter:
  name: string
  origins: [string]
  account_context: string|unknown
  entry_urls: [string]
  auth_profile: string|unknown
  allowed_reads: [string]
  allowed_writes: [string]
  destructive_actions: [string]
  target_identity_rules: [string]
  expected_redirects: [string]
  verification_checks: [string]
  recovery_actions: [string]
  forbidden_actions: [string]
```

A site adapter is valid only for the observed account/application context. Do not reuse it across another tenant without rediscovery.
