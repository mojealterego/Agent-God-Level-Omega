---
name: omega-repository-cartographer
description: Use before modifying an unfamiliar or large repository. Maps architecture, branches, ownership, build graph, tests, CI, generated code, protected areas, and change blast radius so implementation is based on observed structure rather than guesses.
---

# Repository Cartographer

## Baseline capture

Observe:
- root path and repository identity;
- current branch and HEAD;
- remotes;
- worktrees;
- dirty state;
- recent relevant history;
- submodules/subtrees;
- monorepo/package boundaries;
- generated/vendor directories.

## Architecture map

Identify:
- executable entry points;
- libraries/modules;
- public APIs;
- persistence/schema layers;
- UI boundaries;
- background workers;
- infrastructure definitions;
- deployment manifests;
- test suites;
- build system;
- code generation.

## Dependency map

Determine:
- direct dependencies of the target;
- reverse dependents;
- runtime boundaries;
- network/database boundaries;
- shared schemas/types;
- generated artifacts.

## Ownership and danger map

Mark:
- protected branches;
- release files;
- migrations;
- lockfiles;
- generated files;
- signing material;
- security-sensitive modules;
- large binary assets;
- code owned by external generators.

## Blast-radius score

Estimate:

`blast_radius = affected_interfaces × reverse_dependents × persistence_risk × deployment_risk`

Use the score only to scale verification effort, never as proof.

## Output contract

Produce a compact internal map sufficient to answer:
- where to change;
- what not to touch;
- how to build;
- how to test;
- what can regress;
- which files need rereading after mutation.
