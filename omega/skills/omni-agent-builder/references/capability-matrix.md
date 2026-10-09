# Capability status matrix v1.0.0

Status vocabulary:

- `reference`: implemented and unit-tested local deterministic reference behavior.
- `prototype`: narrow evaluator or demonstration, NOT a full research paper reproduction.
- `blueprint`: documented seam or export schema, no live connection.
- `adapter_required`: extension slot, no implementation.
- `undefined_requires_spec`: term needs user-provided authoritative definition.

| Request vocabulary | Status | Precise boundary |
|---|---|---|
| Bitemporal Store, Bitemporal, Bitemporal Graph Memory, retrospective correction, point-in-time recovery | reference / graph adapter required | Append-only SQLite as-of; graph temporal links not implemented |
| CoALA, working memory, long-term memory, procedural memory, episodic memory | reference | Typed event records, not semantic neural retrieval |
| GoT, Graph of Thought, GoT Engine, Decision Cycle | reference | Deterministic DAG scheduling and scoring, no native LLM reasoning |
| Adversarial gating, Self Correction, Reflexion Loop | prototype | Score/evidence/approval gates; review text stored as reflection record |
| DGM, DGM Engine, Darwin Gödel Machine, Digital Genotype, mutation loop, mutation engine | prototype | Candidate scoring and gating; no self-rewriting executable agent |
| AlphaEvolve / Alpha Evolve / DeepMind | prototype concept | Source-inspired evaluator workflow, not DeepMind code or IP |
| AB-MCTS, RSI, Gödel, R2 Reasoning, R3 Titans | adapter_required | Requires actual algorithms, evaluators and runtime |
| JEPA Model, JEPA, SNN | adapter_required | Requires model weights/SDK, training and evaluation |
| HDC / deterministic holographic memory | reference | Binary hypervectors and similarity retrieval; no trained embedding model |
| SHIMI index (hierarchical keyword+path), Holographic memory | reference | Local deterministic search; not a trained semantic-index implementation |
| G-Memory | adapter_required | Cross-agent graph query and insight aggregation pending |
| CEV Engine, Cognitive Modulation, Digital Nexus Core | blueprint/adapter_required | Architecture only |
| MCP Gateway, GCP, RAG 2.0, Synthetic Red Team | blueprint | Security, gateway and retrieval/adversarial evaluators not deployed |
| SEGPA, OESI | undefined_requires_spec | Avoid assigning imagined definitions to acronyms |
| ImandraX | adapter_required | Formal methods integration requires tool, licensing and valid contracts |
| Rust + Zenoh latency <1ms | prototype | Benchmark source only; success requires host measurements |

## Framework vs implementation

`profiles/frameworks.json` lists framework targets only and their status. `profile_only` is **not** native implementation. The generator creates runnable deterministic agents in Python, JS ESM, Go and Rust (Rust compilation pending an enabled Cargo host) and importable no-code stage structures. It is not a universal compiler for every language or framework.
