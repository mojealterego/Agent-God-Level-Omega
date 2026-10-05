# Mutation Benchmark Protocol

A benchmarked candidate emits a final JSON metrics line. OMEGA records all repetitions, process exit state, duration distribution and aggregated numeric metrics.

Hard gates are boolean/numeric truth predicates in every successful sample. Any failed process also rejects the candidate.

Recommended fitness flow:

`DigitalGenotype → isolated mutation → tests/security → omega_benchmark → fitness vector → omega_evolution evaluate → Pareto archive`
