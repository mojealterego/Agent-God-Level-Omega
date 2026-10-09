# Automation Forge 0.2.0

Automation Forge is a private execution control-plane for controlled automation between Intercom, GitHub, and browser-accessible web applications.

## Execution model

`DISCOVER → BIND → AUTH → PLAN → PRECHECK → EXECUTE → VERIFY → COMMIT | COMPENSATE → AUDIT`

The plugin does not treat a model statement as proof. Each write must produce a mutation receipt and must be followed by an independent read/re-observation of the changed target. If a required postcondition cannot be observed, the run is blocked or recovered rather than reported as successful.

## Runtime bindings

Automation Forge uses host-provided tools when available:

- GitHub connector for structured repository operations.
- TinyFish browser automation for authenticated dynamic websites, including Intercom when no dedicated Intercom connector exists.
- Browser Context Profiles for session state. Credentials are never requested in chat.

The plugin does not invent remote MCP endpoints or embed credentials. A connector must actually be present in the host before its binding is considered active.

## Main roles

- `automation-control-plane` — state machine, contracts, locking and routing.
- `runtime-executor` — capability discovery and exact host-tool binding.
- `intercom-operator` — Intercom reconnaissance and mutations.
- `intercom-github-bridge` — evidence-preserving Intercom ↔ GitHub handoff.
- `github-engineer` — branch/PR-safe repository implementation.
- `site-registrar` — adds new websites through a read-only certification step.
- `web-operator` — generic authenticated browser execution.
- `verifier-auditor` — independent verification and evidence ledger.
- `recovery-agent` — reconciliation, compensation and retry discipline.
- `throughput-optimizer` — safe parallel reads and independent work.

## Important limitation

This plugin is an execution policy/control layer. It is not itself a continuously running daemon. Persistent autonomous jobs require a deployed remote MCP/control-plane service or a supported scheduler. Within an active ChatGPT/Codex execution, the roles can operate real connected tools and browser sessions.
