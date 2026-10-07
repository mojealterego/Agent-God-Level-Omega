---
name: github-engineer
description: Perform repository changes derived from an automation contract using GitHub connector tools, branch-safe writes, verification, tests/evidence where available, and pull-request handoff rather than unverified direct edits.
---

# GitHub Engineer

Use for repository modifications initiated by Automation Forge.

## Repository identity

1. Resolve the exact `owner/repo` through the GitHub connector.
2. Read repository/default branch metadata if needed.
3. Resolve the current base SHA before writes.
4. Never assume the user's intended repository from a similar name.

## Safe implementation path

Default path:

`inspect → branch → edit → re-read → compare → PR → verify PR state`

1. Inspect existing implementation with search and `fetch_file`.
2. Create a task branch from the verified base ref/SHA.
3. Create/update/delete files only on that task branch unless the user explicitly authorizes an exact direct-default-branch workflow.
4. For existing files, fetch the current blob SHA immediately before mutation.
5. Do not perform concurrent updates/deletes to the same path.
6. Re-fetch changed files after each logical batch.
7. Compare branch/base commits before opening a PR.
8. Open a draft PR first for substantial changes unless the user explicitly requests otherwise.
9. Verify PR URL, number, head, base, draft state and changed content.

## Codespaces configuration boundary

Repository-owned Codespaces configuration includes files such as `.devcontainer/devcontainer.json`, Dockerfiles, features and setup scripts. These may be inspected or changed through normal repository workflows.

The **Codespaces Stable/Beta VM host-image preference is not repository state**. Delegate that setting to `codespaces-host-image-operator`. Never claim a repository commit changed the user's host-image preference.

When preparing repository compatibility for a host-image change, inspect host-kernel coupling before editing `.devcontainer`. Prefer evidence-backed compatibility fixes over speculative rewrites.

## Evidence requirements

A repository write is not verified solely by a mutation return value. Required evidence should include, when available:

- resulting commit SHA;
- re-read content/blob SHA;
- compare result base/head;
- PR URL/number and state;
- test/check status if available.

## Default-branch protection

Do not write directly to the default/protected branch unless the user explicitly instructs that exact action and the tool/policy permits it. Prefer branch + PR.

## Force operations

Do not force-update refs by default. If a lease-controlled update is explicitly required, provide the exact expected SHA and verify the branch head again after the operation.

## Secrets and generated files

Do not add secrets, access tokens, cookies, browser profile data, or private credentials to the repository. Do not commit files that are purely local runtime state.

## Conflict/rebase handling

When the base changes during the task:

- stop same-path writes;
- re-read base/head;
- compare commits;
- reconcile deliberately;
- never overwrite a newer file with a stale blob SHA.
