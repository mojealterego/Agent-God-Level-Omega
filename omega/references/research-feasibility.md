# Research Feasibility Matrix — OMEGA v6

## Implemented as executable mechanisms

| Requested concept | v6 mechanism |
|---|---|
| bitemporal store / bitemporal | append-only bitemporal fact journal |
| bitemporal graph memory | temporal node/edge layer |
| retrospective correction | retract + corrected assertion without history loss |
| point-in-time recovery | transaction-time reconstruction |
| CoALA | working / episodic / semantic / procedural split + decision loop |
| episodic memory | bitemporal event records |
| working memory | bounded task-local queue |
| procedural memory | trigger + ordered action procedures |
| long-term memory | persistent temporal/semantic stores |
| G-Memory | interaction / query / insight hierarchy |
| SHIMI index | semantic hierarchical index |
| HDC / holographic memory | deterministic HD/VSA binding, bundling and similarity |
| RAG 2.0 | fused temporal + semantic + graph + HDC retrieval |
| Graph of Thought / GoT | explicit DAG of thoughts and frontier scoring |
| decision cycle | ordered Observe/Orient/Decide/Act/Reflect state machine |
| Reflexion loop | outcome-weighted episodic lessons |
| adversarial gating | deterministic ACCEPT/CORRECT/RETRY/RETRIEVE_EVIDENCE/ESCALATE gate |
| AB-MCTS | adaptive WIDEN/DEEPEN search scheduler |
| MCP gateway | provider registry + priority routing + circuit breaker |
| digital genotype | immutable agent configuration with lineage |
| mutation loop | staged genotype mutation and evaluation |
| DGM-inspired engine | open-ended lineage archive with hard gates |
| AlphaEvolve-inspired engine | generator/evaluator loop with objective fitness |
| RSI | bounded adoption controller with improvement margin |
| SNN | LIF salience modulator only |
| cognitive modulation | salience-driven retention/review escalation |
| synthetic red team | bounded correctness/security/resilience counterexample generator |

## Real only through external model/provider adapters

| Concept | Reason |
|---|---|
| JEPA | requires a trained predictive embedding/world model |
| Titans | true test-time neural memory requires trained neural architecture |
| R3Mem | true reversible compression requires the trained reversible model |
| ImandraX | requires actual ImandraX/Universe/CodeLogician access and credentials |
| R2-Reasoner | full method requires a trained reinforced router; v6 implements a deterministic capability/cost router |
| DeepMind AlphaEvolve | v6 implements the general evolutionary evaluator architecture, not Google's proprietary system |
| Darwin Gödel Machine | v6 implements safe DGM-inspired lineage/mutation mechanics; it is not Sakana's exact released system |

## Not assigned semantics without a definition

The following names were not given a sufficiently unambiguous technical definition to implement truthfully:
- CEV Engine
- GCP
- OESI
- SEGPA
- Agent Devel
- Digital Nexus Core

OMEGA must not invent expansion/semantics for an undefined acronym merely to claim feature count.

## v6 closure of previously open integration layer

| Layer | v6 implementation |
|---|---|
| Remote MCP federation | Official MCP v2 client adapter, persisted provider registry, tool discovery and calls |
| GoT persistence | Atomic cognitive-state snapshots and restore |
| AB-MCTS persistence | Search tree + posterior restore |
| Evolution persistence | Digital genotype lineage, fitness, admission and Pareto archive restore |
| ImandraX/CodeLogician | Real remote MCP provider adapter; live verification requires endpoint/API key |
| JEPA/Titans/R3Mem | Real external HTTPS provider bridge with provider-specific capability contracts |
| DGM benchmark harness | Warmups, repetitions, JSON fitness metrics, p50/p95 and hard gates |
| Adaptive model router | Persistent online quality/reliability/latency/cost observations with constrained routing |

