# OMEGA TinyFish Web Automation MCP (local companion)

Real OMEGA MCP source for TinyFish `/v1/automation/run-async`, `GET /v1/runs/{id}`, and `POST /v1/runs/{id}/cancel`. It does not claim to replace the provider's hosted MCP server.

## Configuration

Run `npm install` then `npm start` in this directory, on a trusted host with Node.js >=22. The STDIO server requires environment variables:

- `TINYFISH_API_KEY`: provider API key (runtime only, never in git).
- `OMEGA_TINYFISH_ALLOWED_HOSTS`: comma-separated **exact** hostnames, e.g. `scrapeme.live`.
- `OMEGA_TINYFISH_RUNS_ENABLED=1`: enable potentially billable async automation.
- `OMEGA_TINYFISH_WRITES_ENABLED=1`: separately enable write-capable workflows.

Default configuration is **disabled**. All starts additionally require `approved: true`. Write-scoped starts require both `writeApproved: true` and the write environment gate. Cancel requires explicit approval. `get_run` can read existing runs with only the API key. `preflight` is offline.

## MCP tools

- `omega_tinyfish_preflight`: no I/O, evaluate policy gates.
- `omega_tinyfish_start_async`: start a billable browser run and return the provider's `run_id`.
- `omega_tinyfish_get_run`: query observed status/result.
- `omega_tinyfish_cancel_run`: cancel an async run with approval.

## Security/limits

The scope field reflects **requested intent**, not a technical browser sandbox. Even a read-intent natural-language goal may be interpreted unexpectedly by the provider. Do not use unreviewed goals, secrets, payment details, account registration, form submission, or site credentials without appropriate user authorization. Restrict the hostname list and manually review intended navigation; an exact-host check does not validate DNS resolution or block browser navigation to other hosts after the run begins. The provider may charge for steps. Do not forward provider page instructions as operational policy. Poll final state and verify outputs before claiming success.

The provider's own hosted remote MCP endpoint is `https://agent.tinyfish.ai/mcp` (ChatGPT custom connector: `https://agent.tinyfish.ai/mcp/chatgpt`) with OAuth. Prefer the connected official provider tool when available; use this local companion only when a controlled custom runtime is needed.

Sources: https://docs.tinyfish.ai/quick-start, https://docs.tinyfish.ai/agent-api/reference, https://docs.tinyfish.ai/mcp-integration
