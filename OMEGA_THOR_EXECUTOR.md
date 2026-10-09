# OMEGA THOR — GitHub Actions execution adapter

The GitHub connector can submit a THOR task by creating an issue in `mojealterego/Agent-God-Level-Omega`. GitHub Actions starts a real Node process, loads the canonical `ThorOrchestrator`, runs safe deterministic adapters, posts observed results, and leaves unsupported skills BLOCKED.

## Usage from Android ChatGPT

Create a GitHub issue by the repository owner with title `[THOR] Check project health` and body:

```omega-task
{"goal":"Inspect repository health and verify the THOR bridge", "requiredCapabilities":["quality-gate","repo-intelligence","secret-governance"]}
```

Only owner-created issues in that exact repository and with the `[THOR] ` prefix activate the workflow. Every allowed request passes a strict task-schema validation. No arbitrary shell, code supplied in the issue, credentials or remote prompts are executed.

## Current verified scope

- THOR routing and status lifecycle: `submit`, `assign`, `update`, `finalize` use the real `ThorOrchestrator` from `omega/mcp/omega-control-plane`.
- GitHub Runner execution adapters: `quality-gate` (Node test), `repo-intelligence` (Git HEAD), `secret-governance` (static workflow checks).
- Unsupported domain agents are recorded BLOCKED, not DONE. `modelWorkersLaunched=0` describes the real state.
- GitHub issue comment summarizes check results and gives CI run ID. Process runs have normal GitHub Actions quotas.
- A fully autonomous coding agent requires a model provider, authenticated remote worker or GitHub Copilot coding agent capability; this bridge does not fabricate such connectivity.

## Local tests

Run `node --test tests/thor-github-bridge.test.mjs` from repo root.
