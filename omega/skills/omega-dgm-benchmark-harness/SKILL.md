---
name: omega-dgm-benchmark-harness
description: Use when DGM, AlphaEvolve, mutation loops, RSI, or competing implementation candidates require real fitness evidence. Runs bounded warmups and repetitions, parses machine-readable metrics, computes duration percentiles, and rejects candidates that fail hard gates.
---

# DGM Benchmark Harness

Use `omega_benchmark` before admitting performance-oriented mutations into the evolution archive.

## Candidate protocol

The benchmark command must end successful runs with a JSON metrics line, for example:

```json
{"correctness":1,"score":0.92,"memory":128}
```

## Evaluation

1. run bounded warmups;
2. run 1-100 measured repetitions;
3. reject any process failure;
4. aggregate numeric metrics by mean;
5. calculate mean, p50 and p95 wall duration;
6. enforce named hard gates such as `correctness`;
7. feed the resulting measured fitness into `omega_evolution`.

Do not rank a mutation that fails correctness/security gates merely because it is faster.

Keep benchmark input, environment, revision and repetitions stable when comparing candidates. A single timing sample is not sufficient evidence for optimization.
