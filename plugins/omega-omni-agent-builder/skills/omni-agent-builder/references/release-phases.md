# Executable roadmap for full requested scope

## Stage A — v1.0.0 reference baseline (this archive)

Validated schema; DAG execution; Python/JS/Go/Rust deterministic runtimes; Node-RED/n8n JSON topology exports; bitemporal SQLite and typed memory in Python; gated mutation scoring and evidence-aware decision in Python; Zenoh local loopback benchmark Rust sample. Test, ZIP and GitHub integration evidence kept distinct.

## Stage B — live production frameworks

Write interface adapters one at a time for OpenAI Agents, LangGraph, CrewAI, AutoGen/AG2, Google ADK, Mastra, PydanticAI, Semantic Kernel and others. SDK versions pinned and their native tests required; no generic promise that one scaffold runs unchanged in every framework.

## Stage C — trustworthy retrieval and memory

Implement Graph RAG with temporal vertices/edges and event-log replay, CoALA consolidation, embedding provenance, episodic salience retention, memory TTL and ACL, correct as-of caching, graph transaction tests. Evaluate HDC/holographic strategies against reference retrieval benchmark.

## Stage D — distributed Rust/Zenoh and gateway

Implement durable broker, bounded queues, zero-copy decisions, IPC and network p50/p95/p99, multi-host tests, telemetry and rollout gates. Measure <1ms only for a specific path, payload size and hardware; compare against failover/error budget. Secure hosted MCP 2.x service and OAuth resource server with approval controls.

## Stage E — evolutionary cognition and safety

DGM-style candidate archive and lineage; AlphaEvolve-inspired mutation/evaluator, AB-MCTS and GoT search; adversarial model-based judge plus external benchmarks; immutable artifacts and budget gates; human-approved promotion with rollback. Integrate formal verification (ImandraX) only when accessible.

## Stage F — specialized research capabilities

Attach JEPA model inference, SNN/HDC components, cognition modulation, R2/R3-style modules and other terms only after an implementable mathematical/interface specification is available. OESI and SEGPA remain undefined until unambiguous references are provided.
