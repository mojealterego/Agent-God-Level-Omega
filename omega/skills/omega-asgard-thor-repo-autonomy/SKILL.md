---
name: omega-asgard-thor-repo-autonomy
description: Use when Thor must create a new GitHub repository as part of an end-to-end build. The skill gates external creation behind explicit approval or FULL automation mode, uses authenticated GitHub tooling, and verifies the returned repository identity before continuing.
---

# Thor repository autonomy

Thor may create a GitHub repository only through a real authenticated provider. Prefer an existing GitHub MCP provider that exposes repository creation; otherwise use the `gh` CLI through `omega_asgard` action `thor-github-create-repo`. The runtime never stores a GitHub token.

## Procedure

1. Resolve the intended owner, repository name, visibility and description.
2. Run `thor-github-doctor` when using `gh` to confirm authentication.
3. Require either explicit approval or ASGARD `FULL` automation mode. The OMEGA global policy can still require `OMEGA_ALLOW_EXTERNAL`; FULL mode does not bypass the trust kernel.
4. Create exactly one repository and inspect the provider response.
5. Record the repository URL/full name as evidence in Thor and Floki.
6. Do not create destructive follow-up actions, delete repositories, or overwrite an unrelated repository automatically.
7. Continue build/push/release only when the target repository identity has been observed.

