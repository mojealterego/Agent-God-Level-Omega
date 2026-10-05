---
name: omega-bounded-replica-evolution
description: Use when a complex optimization benefits from diversified isolated candidate replicas, but unrestricted self-replication or persistent autonomous copies would be unsafe or unjustified.
---

# Bounded Replica Evolution

Use `replica-plan` to create a finite diversity plan and `replica-tournament` to execute measured candidates in air-gapped, read-only sandboxes. Set an explicit replica limit, candidate commands, hard gates and measurable objectives. Every replica is ephemeral and task-scoped; persistent autonomous self-replication is prohibited.

The tournament may recommend a candidate for later integration only when its observed metrics beat the baseline and all hard gates pass. It never merges code automatically merely because a score is higher. Integration remains subject to the normal diff, security, verification and repository gates.
