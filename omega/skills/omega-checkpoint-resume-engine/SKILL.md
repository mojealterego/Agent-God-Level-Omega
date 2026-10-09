---
name: omega-checkpoint-resume-engine
description: Use for long-running work, tasks likely to be interrupted, or workflows spanning multiple sessions, agents, CI runs, or external waits. Writes deterministic checkpoints and resumes from the last verified state instead of reconstructing progress from conversation memory.
---

# Checkpoint and Resume Engine

## Checkpoint triggers

Create/update a checkpoint after:
- baseline capture;
- completed implementation slice;
- successful verification stage;
- external CI trigger;
- artifact creation;
- before a required wait/approval;
- before context compaction.

## Checkpoint record

Store:
- mission id;
- repository identity;
- branch;
- revision;
- working-tree state;
- completed predicates;
- open predicates;
- current failure;
- next executable action;
- artifact ids;
- CI ids;
- hashes;
- required approvals.

## Resume protocol

On resume:
1. reread repository/tool state;
2. compare with checkpoint;
3. detect drift;
4. invalidate stale assumptions;
5. continue from the last verified predicate.

Never assume the repository stayed unchanged between sessions.

## External wait

When waiting on CI or another external condition:
- record exact run/resource id;
- do not create duplicate actions on resume;
- inspect existing state before retriggering.

## MASTER_OS_ULTIMATE project-state contract

For substantial resumable work, checkpoint state should additionally retain objective/version/current phase/current step, completed/in-progress/blocked work, requirements, decisions, assumptions, risks, quality status and the next executable action. Resume from the first unverified/uncompleted predicate after rereading reality; never replay an already-observed external action blindly. Source synthesis is maintained by `omega-omni-orchestrator/references/master-os-ultimate-source-synthesis.md`.
