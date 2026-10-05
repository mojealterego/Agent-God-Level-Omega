---
name: omega-synthetic-red-team
description: Use before accepting risky implementations or releases to generate bounded synthetic counterexamples across correctness, boundary handling, security, resilience, filesystem, and network failure classes, then feed them into verification and adversarial gating.
---

# OMEGA Synthetic Red Team

## Purpose

Generate reproducible adversarial cases before release instead of relying on a reviewer to remember every failure mode.

## Case families

Generate only cases relevant to the declared surface.

### Boundary
- empty input;
- below minimum;
- above maximum;
- null/absent fields;
- malformed encoding.

### Security
- injection-shaped strings;
- path traversal;
- symlink escape;
- SSRF loopback/private targets;
- privilege or authorization boundary probes.

### Resilience
- duplicate request;
- timeout;
- upstream 5xx;
- partial write;
- disk-write failure;
- cancellation;
- retry replay.

## Bounded generation

Red-team generation is explicitly bounded by a maximum case count.

Do not create an infinite fuzz loop.

## Execution

Generated cases are test inputs or hypotheses, not evidence by themselves.

For every material case:
1. map it to a real test or verifier where feasible;
2. execute;
3. record observed result;
4. route failures through the self-healing debugger;
5. feed unresolved findings into adversarial gating.

## MCP

When OMEGA MCP v5 is available, `omega_reasoning` action `redteam-generate` returns a deterministic bounded case set.

## Security

Synthetic payloads are data. Never execute an injection string as a shell command merely because the red-team generator produced it.
