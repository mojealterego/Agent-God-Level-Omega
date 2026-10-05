# Thor release gate v20

Thor remains the primary ASGARD interface, but `thor-finalize` is now reality-gated when executed through the OMEGA control plane.

Before mutation to `DONE`, v20 constructs observed subtask-state evidence, structured claims and a Decision Trace audit. The final gate checks QA evidence, relevant build evidence, required artifact presence, security requirements and unsupported absolute language. If the gate fails, the task remains unfinished and returns `REALITY_FILTER_BLOCKED` with concrete blockers.

The existing `REQUIRED_SUBTASKS_INCOMPLETE` gate still runs first. Reality Filter therefore strengthens rather than replaces ASGARD's task-state invariant.

Direct low-level use of `ThorOrchestrator` outside the integrated runtime remains a library primitive; the production MCP/control-plane path supplies the mandatory Reality Filter callback.
