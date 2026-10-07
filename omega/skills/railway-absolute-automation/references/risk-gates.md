# Railway risk gates

## Inspect first
Read the target project/environment/service and current staged patch before changes.

## Prefer staging
When a Railway mutation supports `staged: true`, prefer staging for multi-resource or production-sensitive changes. Review with `get_staged_changes` before committing.

## Explicit confirmation required
- `accept_deploy` of staged changes
- permanent service deletion
- permanent volume deletion/data loss
- permanent bucket deletion/content loss
- deleting domains, TCP proxies, webhooks or feature flags when externally relied upon
- resetting bucket credentials
- production-impacting restarts when stateful services or attached volumes are involved
- exposing a service or database publicly over raw TCP

## Never do automatically
- restart database services merely to test connectivity
- erase data to resolve capacity/errors
- overwrite unknown/sealed secrets
- force a repository history rewrite
- bypass provider safeguards or approval gates
