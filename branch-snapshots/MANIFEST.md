# Branch consolidation manifest

All repository development is consolidated into `main`.

## Canonical policy

- `main` is the single target branch for ongoing OMEGA development.
- New corpus-derived agents, skills, tools, hooks, MCP servers and references are written directly to `main`.
- When an older branch contains unique content that would regress newer canonical code if merged literally, its exact file content is preserved under `branch-snapshots/` in `main`.
- Canonical files always prefer the newest compatible implementation; snapshots are provenance/evidence, not active runtime sources.

## Preserved branches

- `docs/heimdall-gemini-cloud-credits-20261008`
- `feat/android-knowledge-bridge`
- `feat/omega-termux-knowledge-connector`
- `feat/phone-knowledge-mcp`
- `feat/phone-knowledge-root-mcp`
- `feat/secure-mcp-tunnel-official`
- `fix/android-bridge-live-status`
- `sync/github-absolute-automation-v0.3.0-current`
- `sync/github-absolute-automation-v0.3.0-final`
- `sync/github-absolute-automation-v0.3.0`

`feat/corpus-forge-batch-001` contained no unique commits relative to the main line when consolidation started.
