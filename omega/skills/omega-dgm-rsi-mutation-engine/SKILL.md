---
name: omega-dgm-rsi-mutation-engine
description: Use when agent architecture or workflow itself may improve through measured mutations. Implements digital genotypes, DGM-inspired lineage archives, bounded mutation loops, hard correctness gates, AlphaEvolve-style evaluator-driven selection, Pareto retention, and safe RSI adoption rules.
---

# DGM / RSI Mutation Engine

## Digital genotype

Represent an agent configuration as versioned data:
- reasoning policy;
- memory policy;
- tool policy;
- search strategy;
- verifier strategy;
- prompt/workflow configuration.

Each mutation creates a new immutable genotype linked to its parent.

## Mutation loop

`SELECT PARENT → MUTATE → ISOLATE → EVALUATE → HARD GATES → ARCHIVE → ADOPT OR REJECT`

Never modify the live evaluator or safety policy merely to improve the score.

## DGM-inspired archive

Retain diverse stepping stones, not only the single current winner.

A lower-scoring ancestor may still enable a later superior lineage.

## AlphaEvolve-style selection

Use objective evaluators and a program/candidate database.

Hard correctness and security gates precede performance ranking.

## RSI boundary

Recursive self-improvement is bounded by:
- generation limit;
- compute/cost budget;
- independent evaluation;
- improvement margin;
- sandboxing;
- immutable safety/authorization rules.

No candidate is adopted because it claims to be better.

## MCP

Use `omega_evolution` to store baselines, evaluate mutations, inspect lineage, and query the Pareto archive.
