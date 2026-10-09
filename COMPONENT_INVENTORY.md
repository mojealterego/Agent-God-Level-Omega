# OMEGA Component Inventory — 2026-10-09

## Counting methodology

This inventory is derived from the complete `main` git tree, not from the obsolete top-level release baseline of 166 skills and not just from the canonical `omega/skills` area. Counts of files or directory names must not be confused with independently implemented, tested agent capabilities.

| Metric | Git tree count |
| --- | ---: |
| Physical `SKILL.md` files, all areas | 813 |
| `omega/skills/*/SKILL.md` | 402 |
| `omega-mobile/skills/*/SKILL.md` | 179 |
| `plugins/**/SKILL.md` | 232 |
| Distinct parent-directory names across `SKILL.md` | 565 |
| Distinct Git blob identities for `SKILL.md` | 573 |
| Formal legacy registry agents (`omega-mobile/agents/registry.json`) | 171 |
| Separate `omega/agents/*/AGENT.md` entries | 13 |
| Estimated distinct registered/standalone agent names, accounting for 1 overlapping name | 183 |

The 813 physical skill files include mirrored and plugin-distributed copies. Distinct basename counts and distinct blob counts are **not** equivalent to a reviewed count of semantically unique skills. Registry agents and skill-based agent definitions are not exhaustively reconciled by this file.

## Single-main consolidation contract

- Working/source-of-truth development is on `main`; 11 historical branch refs have been restored as immutable recovery anchors. Do not prune them automatically. Avoid duplicating agents, skills, tools, hooks, or MCP services.
- Historical branch commits are reachable through the consolidation merge history; code differences must be inspected for current-main equivalence or integrated with tests before legacy refs can be deleted.
- Automated branch cleanup/deletion is disabled. Historical recovery branches remain intact unless the user later explicitly approves removal.
- Never report only `omega/skills` as the total number of skills in the repository.
- Future component increments must update this inventory from the complete current `main` tree, not from guessed numbers.

## Reconciled functional surfaces from historical branches

- Android knowledge bridge, phone knowledge root, and Termux secure MCP tunnel: canonical main implementations retained; older branch behavior for text `offset` pagination and `OMEGA-KNOWLEDGE` folder fallback restored into the current runtime instead of replacing it with older code.
- Asgard Heimdall cloud-offer seed and GitHub Absolute Automation/Jekyll plugin: relevant source entries already present on `main` at matching blob hashes; outdated branch-level release metadata, workflow-action versions and README text were not used to overwrite more recent main versions.
- `omega-mobile/mcp/omega-control-plane/src/core/knowledge-folder.mjs` and its tests are present for compatibility, alongside the newer `PhoneKnowledgeRoot`; no duplicate MCP routes added.

## Historical single-branch cleanup — superseded by restoration

On 2026-10-09, after the source-compatibility gates and full OMEGA CI passed, GitHub branch enumeration returned exactly one ref: `main`. The 11 legacy branch heads remain ancestors of the main merge history, with their original commit objects and source trees reachable through Git history. 103 branch-changed source paths were examined by the consolidation gate; all exist on main. New capability regressions were repaired in the active mobile runtime instead of copying older files or duplicating MCP endpoints.

The actual complete **single unified runtime/application** is not claimed as finished; future source integration and packaging must proceed on `main` only.


## Verified current preservation state (2026-10-09)

- **12 GitHub branches currently exist:** `main` and all 11 restored historical refs at their original SHA values; new source changes target `main` only.
- Current `main` has **813** physical `SKILL.md` files: 402 canonical, 179 mobile, 232 plugin mirrors. This physical count includes duplicate distribution copies.
- The owned OMEGA v25.1.1 plugin file list contains 1041 entries; 1040 are present at matching paths under `omega/` in main. Its remaining entry is a generated Python `.pyc` cache file, not portable source. This is a path-presence comparison, **not** a byte-for-byte or runtime functionality proof.
- The preserved history and legacy refs do not prove all expected features are active. Detailed capability/runtime verification remains distinct.
