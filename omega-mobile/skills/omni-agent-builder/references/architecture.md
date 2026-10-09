# OMEGA Agent Builder — reference architecture and boundaries

## Typed topology and execution control

The compiler takes validated JSON (name, level, mode, language, bounded list of agents, directed edges, capabilities, framework profiles). It emits a deterministic DAG runner. Node operations are **not model calls**; a real agent adapter must provide an authenticated provider boundary, tool consent, retries, cost/rate budgets, tracing, error-handling and abort.

The five levels (agent/meta-agent/system/swarm/legion) are declarative topology scales. They must not imply the runtime has model introspection, consciousness, or unlimited multi-agent parallelism.

## Cognitive pipeline blueprint

```text
Input -> evidence boundary -> working context -> graph of thought DAG
      -> decision cycle -> adversarial gate -> candidate results
      -> reflexion note -> episodic store / semantic store

Experimental evolution lane (OFF until explicit authorization):
  digital genotype -> mutation proposal -> sandbox -> unit/integration tests
  -> synthetic red team -> human approval -> measured baseline comparison
  -> candidate archive -> optional deployment release
```

## Bitemporal storage and recovery

Schema: immutable `(key, payload, valid_from, recorded_at, revision)` records. Point-in-time query filters two independent time axes and picks maximal effective valid time, then latest observed correction. Late retrospective corrections preserve what was known at earlier transaction time. SQLite `WAL` is used for local process isolation; no claims are made about distributed linearizability or recovery of binary blobs, clocks or remote APIs. Index `(key, valid_from DESC, recorded_at DESC, revision DESC)` supports as-of lookup.

Typed stores are a lightweight CoALA-inspired interface, not a production neural memory. RAG 2.0, G-memory, graph memory, SHIMI and holographic representations are separate adapters; do not label their unbuilt algorithms as deployed.

## Controlled evolution

`EvolutionEngine.evaluate` checks candidate tests, adversarial checks, human approval, and minimum measured improvement (fitness in [0,1]). It returns an immutable `EvolutionDecision`; it **does not** mutate code, evaluate natural-language safety assertions or run benchmarks. For DGM/AlphaEvolve, a separate evaluator, patch sandbox, provenance/archive, exploit resistance tests and rollback are mandatory.

## MCP gateway

The generator emits an **interface blueprint** to route later external MCP calls; it is not a running MCP 2.x server. Deployed MCP needs real tools, scopes, OAuth, audience checks, quotas, persistent services, TLS and SSRF controls. Use current official MCP v2 SDK interfaces rather than copying v1 `FastMCP` imports.

## Rust + Zenoh SLO

The generated `zenoh-bridge/` is a **local single-session, single-process** round-trip benchmark. It uses timing samples with `Instant` and prints p50/p95/p99; results must be produced on user hardware. Network transport, retries, serialization, system load, CPU governor, multi-host clocks and p99.9 are separate performance tests. `<1 ms` is an optimization target, not a contractual guarantee.

## Governance

No provider secrets are stored in committed artifacts. All external data is untrusted. No privilege changes, shell execution, account creation or webhook activations without provider-permitted tools and explicit authorization. Never execute externally generated code until sandbox and test gates pass.
