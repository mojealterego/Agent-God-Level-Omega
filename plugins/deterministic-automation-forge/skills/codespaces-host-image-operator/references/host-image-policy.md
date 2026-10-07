# Codespaces Host Image Policy

## Evidence schema

```yaml
codespaces_host_image:
  account_context: string|unknown
  preference: STABLE|BETA|unknown
  effective_image_channel: STABLE|BETA|unknown
  beta_available: true|false|unknown
  repository: owner/name|unknown
  devcontainer_paths: []
  host_coupling_risk: LOW|MEDIUM|HIGH|UNKNOWN
  risk_evidence:
    - path: string
      reason: string
  current_host_image_source: string|unknown
  promotion_date: string|unknown
  mutation_surface: STRUCTURED_CONNECTOR|AUTHENTICATED_BROWSER|unavailable
  before_evidence: []
  after_evidence: []
  recovery_plan: []
```

## Deterministic decision table

| Condition | Default recommendation |
| --- | --- |
| User explicitly requires Stable | Stable |
| User explicitly requires Beta for testing | Beta after auth + compatibility precheck |
| Host-coupling risk HIGH | Stable |
| Host-coupling risk UNKNOWN and reliability matters | Stable |
| No Beta image is currently available | Preference may remain Beta, but effective state must be recorded as Stable |
| Beta regression observed | Roll back preference to Stable and re-verify |

## Verification rules

- Account preference is proven only by direct account-setting read/re-observation.
- Effective host channel is proven only by directly observed environment/provider evidence.
- Repository `.devcontainer` state is never accepted as proof of account Stable/Beta preference.
- Promotion/version dates must come from current GitHub documentation or the `github/codespaces-host-images` repository when those details are needed.
