# OMEGA MCP Control Plane

## Architecture

```text
OMEGA Omni-Orchestrator
        ↓
Capability Discovery Router
        ↓
Tool Autonomy Broker
        ↓
┌──────────────────────────────────────────────────────────┐
│                 OMEGA MCP CONTROL PLANE                 │
│ capability registry → policy kernel → bounded executor │
│            ↓ adapters                ↓ evidence         │
│ terminal | git | CI | container | build | sandbox      │
│ Android device/emulator | verifier | artifact inspector │
└──────────────────────────────────────────────────────────┘
        ↓
Observed state / hashes / exit status / remote IDs
        ↓
SASOS Evidence Ledger + Completion Gates
```

## Policy boundary

OMEGA MCP separates five concerns:

1. protocol transport;
2. authorization/policy;
3. provider adapters;
4. execution lifecycle;
5. evidence returned to the cognitive layer.

The MCP transport is not trusted to decide whether an operation is safe. Every adapter goes through the policy kernel before process execution.

## Default deny gates

- unrestricted terminal execution;
- project code execution;
- external mutation;
- high-impact mutation;
- shell interpreters.

Each gate is opt-in through deployment configuration and still remains subject to host/user policy.

## Transport

The bundled server targets the MCP TypeScript SDK v2 and stdio transport. `serveStdio` is used so the SDK can serve the modern MCP 2026-07-28 era while retaining its supported legacy negotiation path.

Stdout is reserved for MCP JSON-RPC. Runtime diagnostics go to stderr.

## Evidence model

Every bounded process result records:
- sanitized argv;
- canonical cwd;
- effective side-effect class;
- timestamps;
- exit code/signal;
- timeout state;
- bounded stdout/stderr;
- truncation flags;
- evidence identifier and SHA-256.

Secrets are never intentionally persisted as evidence payloads.
