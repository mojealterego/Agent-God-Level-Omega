# Knowledge and session continuity — v23

Knowledge docsets are identity-scoped and support compare-and-swap writes plus approval queues for protected paths. This preserves a shared substrate without allowing agents to overwrite newer knowledge silently. Session continuity is scoped by provider + work item + workflow. A session with unresolved work is not resumed automatically, and there is no branch-wide fallback that could mix unrelated tasks.
