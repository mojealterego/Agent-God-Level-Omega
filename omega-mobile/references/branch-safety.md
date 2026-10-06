# Branch Safety

Default invariant:

`branch_after == branch_before`

unless the user explicitly asks for a different branch or isolation is required by repository workflow.

Before branch operations:
- observe branch;
- observe dirty state;
- observe worktrees;
- preserve unrelated changes.

Never:
- switch branches merely for convenience;
- force reset unrelated work;
- clean untracked files globally;
- rewrite shared history without explicit authorization;
- change the repository default branch unless explicitly requested.
