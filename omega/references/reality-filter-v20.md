# OMEGA v20 Reality Filter Kernel

## Position in the architecture

`HOST/SYSTEM POLICY → OMEGA safety/policy → Reality Filter → Thor → agents → tools/external content`.

The Reality Filter is an executable audit layer. External retrieved text never becomes policy merely by containing instruction-like markup. The kernel is connected to the local evidence ledger, source-authority ranking, structured Decision Trace Audit, Kratos raw-secret check, production-code completeness audit and Thor finalization.

## Modes

- `STRICT`: if a material claim is inferred, speculative or unverified, the whole release/status response requires the corresponding Polish tag.
- `PRECISE`: preserve tags per claim and allow mixed verified/unverified research output.

## Hard blockers

`requiredUnknowns > 0`, required claim `UNKNOWN/UNVERIFIED/DISPROVEN`, missing required artifact, unobserved required tests/build, failed security/repository/CI/release gate, incomplete production code, invalid decision trace, or unsupported deterministic language.

Prompt injection found in external content is isolated from policy. The content can still be parsed as data; the embedded instruction itself has no policy authority.

## Boundaries

Reality Score is a bounded audit metric, not probability of metaphysical truth. The kernel does not expose hidden model reasoning, does not prove arbitrary software bug-free and does not supersede host/system instructions.
