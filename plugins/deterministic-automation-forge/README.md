# Automation Forge 0.3.0

Automation Forge is a private execution control-plane for controlled automation between Intercom, GitHub, GitHub Codespaces, and browser-accessible web applications.

## Execution model

`DISCOVER → BIND → AUTH → PLAN → PRECHECK → EXECUTE → VERIFY → COMMIT | COMPENSATE → AUDIT`

The plugin does not treat a model statement as proof. Each write must produce a mutation receipt and must be followed by an independent read/re-observation of the changed target. If a required postcondition cannot be observed, the run is blocked or recovered rather than reported as successful.

## Runtime bindings

Automation Forge uses host-provided tools when available:

- GitHub connector for structured repository operations.
- TinyFish browser automation for authenticated dynamic websites and account-level GitHub settings when no structured connector exists.
- Browser Context Profiles for session state. Credentials are never requested in chat.

The plugin does not invent remote MCP endpoints or embed credentials. A connector must actually be present in the host before its binding is considered active.

## Main roles

- `automation-control-plane` — state machine, contracts, locking and routing.
- `runtime-executor` — capability discovery and exact host-tool binding.
- `intercom-operator` — Intercom reconnaissance and mutations.
- `intercom-github-bridge` — evidence-preserving Intercom ↔ GitHub handoff.
- `github-engineer` — branch/PR-safe repository implementation.
- `codespaces-host-image-operator` — Stable/Beta host-image preference, compatibility analysis and rollback discipline.
- `site-registrar` — adds new websites through a read-only certification step.
- `web-operator` — generic authenticated browser execution.
- `verifier-auditor` — independent verification and evidence ledger.
- `recovery-agent` — reconciliation, compensation and retry discipline.
- `throughput-optimizer` — safe parallel reads and independent work.

## GitHub Codespaces host image

Automation Forge treats the Codespaces VM host image and the dev-container image as separate configuration layers.

- Stable is the default recommendation for reliability-sensitive workflows.
- Beta is used deliberately for early compatibility testing or access to host-level improvements.
- If GitHub exposes no beta host image, a Beta preference may still result in a Stable-hosted codespace; the operator records the observed effective state rather than assuming Beta was used.
- A host-image preference change is an account-level GitHub setting, not a repository commit. It is changed only through an authenticated supported account-setting surface.
- The operator inspects `.devcontainer/`, Dockerfiles, privileged/container features, kernel modules, nested virtualization assumptions and host-coupled tooling before recommending or applying Beta.
- When Beta causes incompatibility, recovery returns the preference to Stable and re-verifies the resumed/new codespace path.

Current host-image version facts and promotion dates are fetched from GitHub's `github/codespaces-host-images` repository when needed instead of being hard-coded into the plugin.

## Important limitation

This plugin is an execution policy/control layer. It is not itself a continuously running daemon. Persistent autonomous jobs require a deployed remote MCP/control-plane service or a supported scheduler. Within an active ChatGPT/Codex execution, the roles can operate real connected tools and browser sessions.
