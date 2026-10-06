---
name: omega-context-compiler
description: Use when a task spans many files, repositories, docs, or agents and the active context must be minimized without losing critical constraints. Compiles a task-specific context capsule from authoritative evidence and refreshes it when dependencies change.
---

# Context Compiler

## Objective

Maximize signal density while minimizing context noise.

## Context capsule

Compile only:
- mission;
- acceptance criteria;
- hard constraints;
- branch/revision;
- target interfaces;
- relevant file excerpts;
- current failing evidence;
- current implementation slice;
- required official docs;
- unresolved questions.

## Exclusion rule

Exclude:
- old successful logs after their result is recorded;
- unrelated project history;
- repeated user prose already normalized into criteria;
- code outside the dependency radius unless needed for review.

## Freshness rule

Every context item has:
- source;
- revision/version;
- freshness;
- invalidation trigger.

## Retrieval order

1. local authoritative source;
2. project docs/config;
3. official external docs;
4. secondary evidence only when primary sources are insufficient.

## Context pressure response

When near context limits:
- write durable checkpoints if available;
- preserve hashes and references;
- compress explanations;
- never compress away acceptance criteria or unresolved failures.
