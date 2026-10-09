---
name: github-automation
description: Operate GitHub end-to-end from ChatGPT on Android, web or desktop using the connected GitHub app. Use for repository analysis, code changes, branches, issues, pull requests, Actions/CI, GitHub Pages/Jekyll routing, Projects, releases, security triage, governance and autonomous engineering workflows.
---

# GitHub Absolute Automation

Use the connected GitHub app as the source of truth for available tools, permissions and schemas. Do not depend on a local or packaged MCP runtime for normal operation.

## Cross-platform requirements

1. Support Android, ChatGPT web and desktop from the same plugin.
2. Do not require a PC, local Git clone, Docker, shell, stdio, VS Code, Codex CLI, Claude Code, OpenCode or manual terminal commands when the connected GitHub app can perform the task.
3. Use the host-supported GitHub authorization flow. Never ask the user to paste PATs, private keys or secrets into chat.
4. If a capability is not exposed by the connected GitHub app on the current host, state the exact limitation rather than fabricating a successful operation.
5. Keep outputs mobile-usable: concise status, exact repo/branch/PR identifiers, provider links and clear next actions.

## Capability routing

For GitHub Pages, Jekyll, Pages Actions workflows, themes, front matter, custom domains, Pages build failures or Pages deployment incidents, load and follow the `github-pages-jekyll` skill in this plugin before editing the repository.

## Autonomy policy

Execute reversible, in-scope work autonomously: inspect repositories and history, create task branches, edit files, commit changes, open/update issues and PRs, inspect CI, diagnose failures, patch and re-check, triage dependency/security findings, and continue until the requested acceptance condition is observable or a real blocker is reached.

Require explicit confirmation immediately before destructive or high-impact operations such as deleting repositories, force-pushing shared history, changing visibility or broad access, disabling security protections, destructive bulk operations, or publishing externally when publication was not explicitly requested.

## Execution loop

1. Discover the exact repository, default branch, open work and relevant checks.
2. Inspect current code/configuration and preserve unrelated work.
3. Use the smallest coherent branch/PR workflow that can achieve the goal.
4. Implement complete changes and commit them with specific messages.
5. Verify CI, review state and relevant security signals using GitHub evidence.
6. Repair evidence-backed failures and repeat verification until green or blocked.
7. Finish only when the requested state is observable in GitHub.

## Reporting

Separate facts returned by GitHub, changes actually made, checks actually observed, inferences, and blocked actions due to permissions or unavailable tools. Never claim a commit, branch, PR, merge, workflow run, release, deployment, remediation or setting change unless the connected GitHub operation succeeded and the resulting state was re-read when relevant.
