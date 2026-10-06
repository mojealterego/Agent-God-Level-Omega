# OMEGA — feasibility review of external agent/CI/MCP sources

Date: 2026-10-06

This review records what is technically useful to OMEGA, what has been implemented internally, and what remains an optional external adapter. Installing every Marketplace Action would increase supply-chain and permission surface without adding equivalent value.

## Decisions

| Source | Feasibility | OMEGA decision |
|---|---|---|
| audnai/penclaw-GLM-5.3-abliterated | Remote-only | Added a non-default, remote OpenAI-compatible `red_team_only` provider profile. No weights are bundled/downloaded. Explicit authorization is required. |
| aakarim/OpenLore | High | Added an optional read-only-by-default remote MCP profile/registration adapter. Existing governed knowledge/CAS concepts remain primary. |
| ChatGPT & Codex Plugin Autopilot | High | Added deterministic ZIP packaging and SHA-256 manifests internally; no external Action required. |
| Trustabl fix agent reliability | High, optional | Existing OMEGA reliability plane remains primary; external scanner is optional and must be pinned. |
| Sigbound | High as reference | OMEGA already has worktree/landing and repo-owned policy concepts; third-party auto-merge stays off by default. |
| Ryu for GitHub | Reference only | Useful runtime/plugin architecture, but large overlap and mixed licensing boundaries make vendoring unjustified. |
| invAIriant audit gate | High | Stable evidence IDs and evidence-first severity gating are implemented internally. |
| SecureAI-Scan | High, optional | External scan remains optional; deterministic internal gates remain the default CI authority. |
| React Native Audit | Conditional | Route only when React Native is actually detected; native Android remains a separate lane. |
| OpenCode GitHub Action | Conditional | Optional external coding-agent provider; comment-driven repository writes are not enabled by default. |
| setup-ollama | Conditional | Suitable for small local CI models, explicitly not for the 753B GLM profile. |
| Claude Code memory | High as reference | Memory policy requires provenance and blocks silent promotion of untrusted PR memory. |
| Claude Code session | High as reference | Work-item/workflow scoping is retained through OMEGA's internal session continuity. |
| Issue Validator & AI Log Review | Partial | Added deterministic issue completeness + byte hashing; LLM “log authenticity” is not proof. |
| PyVisualizer Architecture Ground Truth | High | Added stdlib AST import graph, parse checks and cycle discovery; richer diagrams remain optional. |
| Looped AF agent | Conditional | Bounded/stateless run pattern is useful; external execution stays explicit and budgeted. |
| Polygraph MCP gate | High | Added explicit-target adapter; it never auto-installs Polygraph. |
| Airlock AI release gate | High | MCP/tool permission expansion and model-provider changes are review-required risk surfaces. |
| GSC Security Audit | Manual only | PoC generation/self-healing is too broad for default CI; no automatic exploit-PoC or auto-fix lane. |
| Agent Sync Action | High as reference | Existing canonical agent sync remains primary; preferred CI behavior is drift-check/dry-run. |
| AutoDemo Demos-as-Code | Conditional | Existing demo contract validation remains primary; capture requires a runnable app and explicit demo spec. |

## Implemented assurance layer

### Evidence and release assurance
`assurance_gate.py` emits deterministic JSON findings with stable `evidence_id` values derived from observed evidence. High/critical findings fail by default. Workflow checks reject `pull_request_target`, `write-all`, remote pipe-to-shell installers, unversioned Actions and mutable Action refs.

### Architecture ground truth
Python architecture checks parse source with `ast` without importing application code. Parse failures are blocking. Internal import cycles are discovered and advisory by default.

### Governed knowledge
Knowledge manifests hash each document and the complete collection. OpenLore is integrated as an optional remote MCP provider rather than copied into OMEGA; its profile is read-only by default and returned content remains untrusted data.

### Model-provider governance
The GLM-5.3 abliterated profile is non-default, remote-only, does not bundle weights, uses endpoint/API-key environment references and requires explicit authorization. The model registry itself is a sensitive release surface.

### MCP behavioral testing
The Polygraph adapter accepts an explicit MCP target, never silently installs packages, and only executes an already-installed binary when `--execute` is explicitly supplied.

### Deterministic packaging
`reproducible_zip.py` normalizes file order, timestamps and permissions, excludes transient caches, emits a SHA-256 content manifest and supports byte-for-byte reproducibility checks.

## Deliberately not implemented

- Third-party agent auto-merge by default.
- Comment-triggered agents with repository write permissions by default.
- Automatic exploit-PoC generation or self-healing security patches.
- Blind restoration of agent-authored memory from untrusted pull requests.
- Local download/serving of the 753B GLM model.
- Vendoring Ryu Gateway/UI or overlapping agent runtimes.
- Claims that optional scanners ran when they were not actually installed and executed.

## Reviewed sources

- https://pirateface.co/audnai/penclaw-GLM-5.3-abliterated
- https://huggingface.co/audnai/penclaw-GLM-5.3-abliterated
- https://github.com/aakarim/OpenLore
- https://github.com/marketplace/actions/chatgpt-codex-plugin-autopilot
- https://github.com/marketplace/actions/trustabl-fix-agent-reliability-issues
- https://github.com/marketplace/actions/sigbound
- https://github.com/marketplace/actions/ryu-for-github
- https://github.com/marketplace/actions/invairiant-audit-gate
- https://github.com/marketplace/actions/secureai-scan
- https://github.com/marketplace/actions/react-native-audit
- https://github.com/marketplace/actions/opencode-github-action
- https://github.com/marketplace/actions/setup-ollama
- https://github.com/marketplace/actions/claude-code-memory
- https://github.com/marketplace/actions/issue-validator-ai-log-review
- https://github.com/marketplace/actions/pyvisualizer-architecture-ground-truth
- https://github.com/marketplace/actions/run-a-looped-af-agent
- https://github.com/marketplace/actions/polygraph-mcp-gate
- https://github.com/marketplace/actions/airlock-ai-release-gate
- https://github.com/marketplace/actions/claude-code-session
- https://github.com/marketplace/actions/gsc-security-audit
- https://github.com/marketplace/actions/agent-sync-action
- https://github.com/marketplace/actions/autodemo-demos-as-code
