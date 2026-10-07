---
name: railway-absolute-automation
description: Use for end-to-end Railway project operations, deployments, environment configuration, observability, incident repair, staged infrastructure changes and GitHub-backed source/CI workflows from Android, web or desktop.
---

# Railway Absolute Automation

Operate Railway as an evidence-driven cloud control plane. The package is cross-platform and intentionally contains no `mcp.json` or `.mcp.json`.

## Operating principles

1. Start with `list_projects`, `list_services`, `describe_environment`, `environment_status` and related read tools before mutation.
2. Prefer staged Railway changes when the tool supports `staged: true`.
3. Before committing staged infrastructure, call `get_staged_changes` and summarize create/update/delete effects.
4. Treat `accept_deploy` as destructive/consequential: invoke only after the user has explicitly confirmed deployment of the staged patch.
5. For direct destructive operations such as deleting services, volumes, buckets, domains, webhooks or feature flags, require explicit immediate confirmation.
6. Do not use deletion or restart as a connectivity test.
7. Never fabricate project IDs, service IDs, environment IDs, deployment IDs, domains, variables, regions or provider state.
8. Mark success only after Railway reports the expected live state.

## End-to-end repair loop

For a broken service or deployment:

1. Identify the exact project/environment/service.
2. Read `environment_status` and recent `list_deployments`.
3. Use `get_deployment_diagnosis` when available.
4. Inspect `get_logs`; add `list_traces` / `get_trace`, HTTP error-rate/latency and service metrics when relevant.
5. Determine whether the root cause is source code, service configuration, variables, networking, storage, domain/cert, runtime health or platform state.
6. If source code is responsible, inspect and modify the authoritative GitHub repository using the connected GitHub app; preserve the current branch unless the user explicitly requests otherwise.
7. If Railway configuration is responsible, stage the smallest reversible change first where supported.
8. Review staged changes and destructive impact.
9. Apply/redeploy only under the applicable confirmation boundary.
10. Poll provider state and verify logs, status, metrics or traces after the final change.
11. Continue until healthy or until a real external blocker is evidenced.

## Railway capability domains

### Projects and environments
- list/create projects and workspaces
- inspect services and environments
- use preview/PR environments where supported
- keep production and staging identities explicit

### Services and functions
- create/update services
- connect GitHub repositories or public images
- create/update Railway Functions
- inspect source/config before replacement
- use redeploy for an existing build and restart only when appropriate

### Variables and secrets
- list variable names and available rendered values according to provider permissions
- prefer Railway reference variables such as `${{Service.VARIABLE}}`
- never ask the user to paste secrets into chat when provider-native variables or secret mechanisms can be used
- never overwrite sealed/unknown secrets blindly

### Storage
- volumes: create/update/attach/detach/delete with explicit data-loss awareness
- buckets: create/update/read connection metadata; credential rotation is consequential and must be deliberate

### Networking
- generated/custom domains
- TLS/domain status and retry paths
- TCP proxies only when public raw TCP exposure is actually intended

### Feature flags
- inspect before update
- treat deletion as destructive

### Webhooks
- use `test_webhook` before creating/updating where practical
- do not pass secret header values through unsupported tool paths

### Observability
- deployment status and history
- build/runtime/http/network/dns logs
- CPU/memory/network metrics
- HTTP request counts, 5xx error rate and latency percentiles
- tracing state, trace search, individual traces and tracing coverage

## GitHub + Railway orchestration

Use GitHub as the source-of-truth code layer and Railway as the runtime/infrastructure layer:

`issue/goal -> repository inspection -> code/config change -> commit/PR -> CI -> Railway deployment -> logs/metrics/traces -> repair -> verification`

Do not claim a GitHub Projects v2 board was read unless a live tool actually exposes Projects v2. The supplied Railway organization project board is tracked as a roadmap source in `references/roadmap-source.md`.

## Android contract

Normal operation must work from connected cloud apps in ChatGPT on Android. Do not require local Railway CLI, Docker, shell, localhost, `stdio`, VS Code or a PC. CLI/IaC instructions are optional implementation references, not prerequisites for using this plugin.

See the references for Railway IaC, risk gates and the supplied roadmap source.
