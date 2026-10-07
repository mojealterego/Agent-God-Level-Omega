# Bridge Transaction

```yaml
bridge_transaction:
  intercom:
    source_url: string
    object_identity: string
    before_revision: string|unknown
    required_after_state: []
  github:
    repository: owner/name
    base_ref: string
    base_sha: string
    task_branch: string
    required_changes: []
    required_checks: []
  dependencies: []
  compensation_boundaries: []
  evidence: []
```
