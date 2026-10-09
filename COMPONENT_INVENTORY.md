# OMEGA Component Inventory — 2026-10-09

## Counting methodology

This inventory is derived from the complete `main` git tree, not from the obsolete top-level release baseline of 166 skills and not just from the canonical `omega/skills` area. Counts of files or directory names must not be confused with independently implemented, tested agent capabilities.

| Metric | Git tree count |
| --- | ---: |
| Physical `SKILL.md` files, all areas | 806 |
| `omega/skills/*/SKILL.md` | 399 |
| `omega-mobile/skills/*/SKILL.md` | 177 |
| `plugins/**/SKILL.md` | 230 |
| Distinct parent-directory names across `SKILL.md` | 562 |
| Distinct Git blob identities for `SKILL.md` | 570 |
| Formal legacy registry agents (`omega-mobile/agents/registry.json`) | 171 |
| Separate `omega/agents/*/AGENT.md` entries | 13 |
| Estimated distinct registered/standalone agent names, accounting for 1 overlapping name | 183 |

The 806 physical skill files include mirrored and plugin-distributed copies. Distinct basename counts and distinct blob counts are **not** equivalent to a reviewed count of semantically unique skills. Registry agents and skill-based agent definitions are not exhaustively reconciled by this file.

## Single-main consolidation contract

- Working source is only `main`. The user explicitly requires a single branch and no duplicate agents, skills, tools, hooks or MCP servers.
- Historical branch commits are reachable through the consolidation merge history; code differences must be inspected for current-main equivalence or integrated with tests before legacy refs can be deleted.
- Branch cleanup is allowed only after branch-content comparison, required compatibility integration, verification of `main` CI, and a separate post-cleanup branch listing.
- Never report only `omega/skills` as the total number of skills in the repository.
- Future component increments must update this inventory from the complete current `main` tree, not from guessed numbers.

## Reconciled functional surfaces from historical branches

- Android knowledge bridge, phone knowledge root, and Termux secure MCP tunnel: canonical main implementations retained; older branch behavior for text `offset` pagination and `OMEGA-KNOWLEDGE` folder fallback restored into the current runtime instead of replacing it with older code.
- Asgard Heimdall cloud-offer seed and GitHub Absolute Automation/Jekyll plugin: relevant source entries already present on `main` at matching blob hashes; outdated branch-level release metadata, workflow-action versions and README text were not used to overwrite more recent main versions.
- `omega-mobile/mcp/omega-control-plane/src/core/knowledge-folder.mjs` and its tests are present for compatibility, alongside the newer `PhoneKnowledgeRoot`; no duplicate MCP routes added.
