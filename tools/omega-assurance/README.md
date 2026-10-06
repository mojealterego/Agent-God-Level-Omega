# OMEGA Assurance Research Toolkit

This directory contains deterministic, stdlib-first assurance utilities derived from a review of contemporary agent CI, MCP, knowledge, architecture, packaging, session-memory and release-gate tooling.

## Implemented

- `assurance_gate.py`: stable evidence IDs, workflow supply-chain audit, Python import/cycle analysis, knowledge manifests, model-provider policy validation, issue-template checks and high-risk artifact diffs.
- `reproducible_zip.py`: sorted, timestamp-normalized deterministic ZIP builds with SHA-256 content manifests.
- `polygraph_adapter.py`: explicit-target planner for an already-installed Polygraph MCP litmus; no silent downloads.
- `openlore_adapter.py`: read-only-by-default OMEGA MCP federation registration payload for a configured OpenLore server.
- `external-adapters.json`: evaluated third-party actions/tools and their allowed operating mode.
- `.omega/assurance-policy.json`: repo-owned assurance policy.
- `.omega/model-providers.json`: remote-only GLM-5.3 abliterated red-team/evaluation provider profile.
- `openlore-profile.json`: optional remote OpenLore MCP profile.

## Operating rules

1. Third-party Actions and CLIs are untrusted until pinned, inspected and explicitly enabled.
2. Default CI is deterministic and does not depend on an external model.
3. A model-generated assertion is not a blocking finding without concrete evidence.
4. Permission expansion, model-provider changes, OAuth/IAM changes and MCP write-surface changes require review.
5. Agent memory/session state is provenance-scoped; untrusted PR state must not silently become privileged context.
6. Large/abliterated models are remote providers, not Android/Termux/GitHub-hosted-runner assets.
7. Third-party auto-fix/auto-merge behavior stays opt-in.

## Commands

```bash
python3 tools/omega-assurance/assurance_gate.py workflow-audit .github/workflows
python3 tools/omega-assurance/assurance_gate.py model-profile-check .omega/model-providers.json
python3 tools/omega-assurance/assurance_gate.py python-arch omega-mobile
python3 tools/omega-assurance/assurance_gate.py knowledge-manifest omega-mobile/references
python3 tools/omega-assurance/reproducible_zip.py omega-mobile --output /tmp/omega-a.zip --manifest /tmp/omega-a.json
python3 tools/omega-assurance/polygraph_adapter.py https://example.invalid/mcp
OMEGA_OPENLORE_MCP_URL=https://example.invalid/mcp python3 tools/omega-assurance/openlore_adapter.py
```

External adapters plan or report availability by default. They do not become execution claims unless the dependency is actually installed and the user explicitly authorizes execution.
