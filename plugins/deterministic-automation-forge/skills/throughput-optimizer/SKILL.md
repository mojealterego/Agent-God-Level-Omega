---
name: throughput-optimizer
description: Increase throughput of a verified automation workflow by batching independent reads, constructing dependency DAGs, minimizing browser round-trips, and parallelizing only operations that cannot conflict.
---

# Throughput Optimizer

Speed is secondary to correctness, but avoid unnecessary serial work.

## DAG construction

Represent the job as nodes with explicit dependencies. Parallelize only nodes that:

- target different resources;
- do not share a mutable Git ref/path/object;
- do not depend on each other's result;
- have independent verification paths.

## Safe batching

Good candidates:

- repository/code searches across different terms;
- read-only inspections of multiple files;
- read-only page extraction from independent URLs;
- verification reads after independent writes;
- issue/PR searches.

Do not parallelize:

- multiple writes to the same GitHub file/ref;
- publish plus configuration writes to the same Intercom automation;
- retries for an uncertain browser mutation;
- rollback concurrent with verification of the same target.

## Browser minimization

For a single site session:

- collect all required read-only facts in one reconnaissance run when practical;
- structure output explicitly;
- execute a coherent mutation group once;
- verify once at the end of that group plus critical checkpoints.

## Throughput metrics

Track:

- connector calls;
- browser runs;
- mutations;
- verified postconditions;
- retries;
- blocked steps.

Optimization is accepted only if evidence quality and stop conditions remain unchanged.
