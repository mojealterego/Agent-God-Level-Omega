---
name: omega-evolutionary-optimization
description: Use when multiple valid implementations can be objectively compared and optimization is worth the compute. Runs a bounded AlphaEvolve-inspired candidate loop with hard correctness gates, reproducible benchmarks, Pareto selection, diversity preservation, and strict self-modification boundaries.
---

# Evolutionary Optimization

## Preconditions

Use only when:
- objective metrics exist;
- candidate diversity is meaningful;
- evaluation is reproducible;
- optimization value justifies cost.

## Hard gates

Candidates failing correctness, security, API compatibility, or required invariants are eliminated before performance ranking.

## Fitness

Use a vector rather than a single score when appropriate:
- p95/p99 latency;
- throughput;
- memory;
- CPU;
- cost;
- binary/bundle size;
- complexity;
- energy;
- mutation score.

## Population loop

1. verified baseline;
2. 2–8 diverse candidates;
3. isolated execution;
4. identical tests/benchmarks;
5. hard-gate elimination;
6. Pareto ranking;
7. archive best niche candidates;
8. bounded next generation if justified;
9. independent winner verification.

## Reproducibility

Record:
- revision;
- environment;
- versions;
- benchmark corpus;
- warmup;
- iterations;
- seeds;
- variance;
- summary statistics.

## Self-improvement boundary

The agent may improve task-scoped code, scripts, prompts, or search strategy.

It must not silently modify:
- host policy;
- approval gates;
- security boundaries;
- completion gates;
- evidence rules;
- user constraints.
