# Remote MCP bootstrap and deployment

The shared Cloud Run MCP requires a one-time Google Cloud bootstrap and a standards-based OAuth/OIDC authorization server.

## Bootstrap

Run from an already authenticated Google Cloud Shell session:

```bash
cloud/google/remote-mcp/bootstrap-gcp.sh --plan
OMEGA_ENABLE_ORG_FABRIC=1 cloud/google/remote-mcp/bootstrap-gcp.sh --apply
```

The bootstrap creates or reuses a dedicated OMEGA control project, links the selected billing account, enables required APIs, creates runtime/deployer service accounts, creates Artifact Registry, and configures GitHub OIDC Workload Identity Federation. When an organization is visible it isolates automated projects under an `OMEGA-Automation` folder rather than granting broad roles at organization root.

If multiple organizations or billing accounts are visible, selection must be explicit through environment variables. The script never guesses between multiple billing or organization targets.

## OAuth

OMEGA is an OAuth resource server, not an authorization server. Configure an external OAuth/OIDC issuer that can issue an access token with audience `urn:omega:mcp` (or your chosen `OMEGA_OAUTH_AUDIENCE`) and scope `omega.mcp`.

Never place OAuth client secrets or service-account JSON keys in the plugin, repository, command line, or chat.

## Deploy

```bash
export OMEGA_OAUTH_ISSUER='https://issuer.example/'
export OMEGA_OAUTH_AUDIENCE='urn:omega:mcp'
cloud/google/remote-mcp/deploy.sh
```

The deploy script runs the MCP test suite, deploys to Cloud Run, locks the canonical public base URL, checks health/readiness and RFC 9728 metadata, and proves that unauthenticated `/mcp` is rejected with HTTP 401.

## Authenticated verification

Obtain an access token through the configured OAuth client flow, then place it only in the process environment:

```bash
export OMEGA_MCP_URL='https://SERVICE.run.app/mcp'
export OMEGA_MCP_ACCESS_TOKEN='...'
cloud/google/remote-mcp/verify-authenticated.sh
```

The verifier lists tools and requires `omega_capabilities` and `omega_host_info` to be visible before the deployment is considered authenticated and usable.
