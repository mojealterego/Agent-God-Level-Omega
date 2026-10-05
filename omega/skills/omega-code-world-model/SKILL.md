---
name: omega-code-world-model
description: Use before risky or non-trivial mutations. Builds a falsifiable software world model from AST/type structure, dependencies, tests, traces, runtime behavior, resource constraints, and deployment semantics.
---

# Code World Model

## Layers

### Structural
- syntax/AST;
- module graph;
- public contracts;
- schemas;
- generated-code relationships.

### Behavioral
- call graph;
- state transitions;
- error paths;
- side effects;
- invariants.

### Temporal
- async ordering;
- retries;
- cancellation;
- concurrency;
- races;
- transaction boundaries.

### Resource
- CPU;
- memory;
- storage;
- network;
- DB connections;
- queue depth;
- GPU/kernel constraints.

### Operational
- CI;
- packaging;
- deployment;
- feature flags;
- migrations;
- rollback.

## Pre-change prediction

Record:
- expected files touched;
- expected tests affected;
- expected failure before fix;
- expected success after fix;
- resource/performance impact;
- compatibility impact.

Then run the smallest experiment capable of disproving the prediction.

## Search

Use bounded candidate exploration.

Do not claim "quantum" or million-branch evaluation unless a real search engine actually performed it.

## Model repair

When execution contradicts prediction:
- preserve the counterexample;
- update the model;
- rerun from the failing boundary;
- add a regression guard when practical.
