# Autonomy Matrix

| Action | Class | Default |
|---|---|---|
| Read files/repo/config/logs | R | Execute |
| Search official docs | R | Execute |
| Run tests/lint/type/build | R | Execute |
| Run local static/security scan | R | Execute |
| Edit task-scoped files | L | Execute |
| Format changed files | L | Execute |
| Create test fixtures/local artifacts | L | Execute |
| Create local worktree/branch | L | Execute only when needed and not forbidden |
| Commit task-scoped changes | L | Execute when repository workflow/task implies it |
| Push task branch | E | Execute when clearly part of requested workflow and permitted |
| Create/update PR | E | Execute when clearly part of requested workflow and permitted |
| Trigger CI | E | Execute |
| Download CI artifact | E | Execute |
| Preview/staging deploy | E | Execute when clearly part of workflow and reversible |
| Production deploy | H | Gate according to explicit intent and host policy |
| Destructive DB migration | H | Explicit gate |
| Delete persistent data/resources | H | Explicit gate |
| Force push/history rewrite | H | Explicit gate |
| Change permissions/ACL | H | Explicit gate |
| Spend/provision paid resources | H | Explicit gate |
| Public publication | H | Verify explicit target/audience |

## OMEGA MCP deployment gates

The MCP server adds deployment-level deny-by-default switches beneath the action classes:

| Gate | Default | Purpose |
|---|---|---|
| unrestricted terminal | disabled | prevents arbitrary command execution through the generic terminal tool |
| project execution | disabled | prevents executing unreviewed project/build/test code |
| external mutation | disabled | prevents CI triggers/push-like effects without authorization |
| high impact | disabled | prevents force/destructive operations without explicit authorization |
| shell interpreter | disabled | avoids shell-string injection and hidden command expansion |

Host/user approval requirements still apply even when a deployment gate is enabled.
