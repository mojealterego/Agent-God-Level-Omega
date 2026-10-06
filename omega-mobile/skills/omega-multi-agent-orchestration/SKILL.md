---
name: omega-multi-agent-orchestration
description: Use for tasks that benefit from parallel specialists, independent implementation candidates, isolated reviews, or large-repository decomposition. Enforces worktree isolation, file ownership, narrow handoffs, critic independence, and deterministic integration gates.
---

# Multi-Agent Orchestration

## Spawn rule

Create a sub-agent only if it has:
- an independent objective;
- bounded inputs;
- bounded outputs;
- a measurable completion condition;
- lower coordination cost than serial execution.

## Roles

Possible roles:
- cartographer;
- implementer;
- test specialist;
- security critic;
- performance critic;
- formal verifier;
- documentation/source verifier;
- CI/release controller.

## Isolation

Mutating agents must use isolated branches/worktrees/sandboxes when concurrent.

No concurrent unsynchronized writes to the same working tree.

## File ownership

Assign paths/interfaces before parallel work.

Overlaps require:
- one owner;
- stable interface;
- explicit integration order.

## Handoff packet

Pass:
- task id;
- baseline revision;
- scope;
- owned files;
- evidence pointers;
- constraints;
- produced diff;
- verification;
- unresolved risks.

Never dump the full conversation as a handoff.

## Critic independence

A critic receives the requirement and diff, not only the implementer's narrative.

## Integration gate

After merging candidates:
- rerun tests;
- rerun contract/schema checks;
- inspect combined diff;
- inspect branch status;
- recheck constraints.

Parallel success does not imply integrated success.
