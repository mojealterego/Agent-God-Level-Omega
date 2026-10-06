# OMEGA v3 Architecture

```text
User Intent
   ↓
Omega Omni-Orchestrator
   ↓
Capability Discovery Router
   ↓
Repository Cartographer ───────────────┐
   ↓                                   │
SASOS State + Context Compiler         │
   ↓                                   │
Code World Model                       │
   ↓                                   │
Planner / Multi-Agent Scheduler        │
   ↓                                   │
Tool Autonomy Broker                   │
   ↓                                   │
Mutation Slices                        │
   ↓                                   │
Tests / Static / Formal / Runtime      │
   ↓                                   │
Adversarial Review                     │
   ↓                                   │
Self-Healing Debugger ────────loop─────┘
   ↓
Security + Performance Governors
   ↓
CI/CD Release Controller
   ↓
Artifact Completion Gate
   ↓
DONE
```

## Research-inspired concept mapping

| Label | Operational mechanism |
|---|---|
| SASOS | shared typed evidence state |
| HNS | compact authoritative context capsule |
| R3Mem | content-addressed evidence + checkpoints |
| Titans | salience-based persistent records through supported storage |
| CWM | structural/behavioral/runtime model validated against execution |
| MARS | executor + independent critic |
| AlphaEvolve | bounded candidate optimization |
| ImandraX | real formal verifier only when available |
| DMA | direct tool/process execution through exposed safe interfaces |
| Quantum MCTS | bounded measurable search, never fictional parallel universes |

## Physical execution substrate

OMEGA v3 adds an optional dedicated MCP control plane under `mcp/omega-control-plane/`. It is a real execution substrate, not a conceptual capability. Skills must detect the MCP tools at runtime before routing through it.
