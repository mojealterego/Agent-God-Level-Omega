# Intercom Automation Snapshot

Use this schema for observed state. Omit nothing silently; use `unknown` for unobserved values.

```yaml
intercom_snapshot:
  source_url: string
  workspace_or_app_id: string|unknown
  object_name: string|unknown
  object_kind: string|unknown
  status: string|unknown
  triggers: []|unknown
  audience_conditions: []|unknown
  knowledge_sources: []|unknown
  instructions: []|unknown
  actions: []|unknown
  routing: []|unknown
  evaluation_state: string|unknown
  analytics_findings: []|unknown
  version_or_revision: string|unknown
  observed_at: string
  evidence: []
```
