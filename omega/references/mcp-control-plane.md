# OMEGA MCP Control Plane v5

## Architecture

```text
OMEGA Omni-Orchestrator
        ↓
Capability Discovery Router
        ↓
Tool Autonomy Broker
        ↓
┌──────────────────────────────────────────────────────────────────┐
│                    OMEGA MCP CONTROL PLANE v6                   │
│ capability registry → policy kernel → bounded executor          │
│ engineering: terminal | git | CI | container | build | Android  │
│ cognitive: memory | reasoning | evolution | gateway             │
│ evidence: exit status | hashes | temporal journal | lineage     │
└──────────────────────────────────────────────────────────────────┘
        ↓
Bitemporal / Graph / CoALA / G-Memory / SHIMI / HDC / Hybrid RAG
        ↓
GoT / Adversarial Gate / Decision Cycle / AB-MCTS
        ↓
Digital Genotype / DGM-inspired Archive / AlphaEvolve-style Loop
        ↓
SASOS Evidence Ledger + Completion Gates
```

## Engineering tools

- `omega_capabilities`
- `omega_terminal_run`
- `omega_repository_inspect`
- `omega_sandbox_create`
- `omega_ci`
- `omega_container_run`
- `omega_build_run`
- `omega_verify`
- `omega_device`
- `omega_artifact_inspect`

## Cognitive tools

### `omega_memory`

Persistent workspace-local cognitive memory:
- bitemporal assertion;
- retrospective correction;
- retraction;
- transaction/valid-time query;
- history;
- point-in-time snapshot;
- episodic memory;
- semantic SHIMI memory;
- procedural memory;
- G-Memory interactions, queries and insights;
- HDC/holographic symbolic records;
- hybrid retrieval.

### `omega_reasoning`

Process-local reasoning state:
- Graph-of-Thought nodes and edges;
- frontier ranking;
- deterministic adversarial gate;
- Observe/Orient/Decide/Act/Reflect cycles;
- AB-MCTS adaptive WIDEN/DEEPEN scheduling.

### `omega_evolution`

Digital-genotype archive:
- baseline registration;
- mutation evaluation;
- hard gates;
- lineage;
- Pareto archive.

## Policy boundary

OMEGA MCP separates:
1. transport;
2. authorization/policy;
3. provider adapters;
4. execution lifecycle;
5. cognitive state;
6. evidence.

The MCP transport cannot bypass the policy kernel.

## Persistence

Bitemporal facts are written as an append-only journal under the selected workspace's `.omega/cognitive/` directory.

Semantic, procedural, G-Memory and HDC state is persisted as an atomic JSON state file.

Reasoning search state remains process-local in this implementation and must be checkpointed by the orchestration layer before server restart if continuation is required.

## Security defaults

Default-deny gates remain in force for:
- unrestricted terminal execution;
- project code execution;
- external mutation;
- high-impact mutation;
- shell interpreters.

Cognitive state writes are restricted to configured workspace roots.

## Evidence model

Every bounded process result records sanitized command evidence. Temporal memory additionally preserves historical assertions instead of overwriting them.

Never treat an internal heuristic as a formal proof or a trained neural memory.
