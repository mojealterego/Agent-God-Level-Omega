---
name: omega-external-neural-providers
description: Use when OMEGA should bind actual cognitive model runtimes over HTTPS JSON or persistent local JSONL processes. Covers provider registration, env-backed secrets, health, invocation, lifecycle, and JEPA/Titans/R3Mem capability contracts.
---

# External Neural Providers v6

Use `omega_cognitive_provider`.

## Provider modes

### HTTP
Use `kind=http` with an HTTPS endpoint. Localhost HTTP is development-only.

### Persistent process
Use `kind=process` with command/args and a bounded timeout. The process stays alive across invocations and exchanges one JSON object per line over stdin/stdout.

Secrets must use `headerEnv` for HTTP or `envMap` for process providers. Static secret-looking env/header values are rejected.

## Built-in process presets

Use `action=preset` and `providerType`:
- `jepa`
- `titans`
- `r3mem`

Then use `action=health` before routing requests.

## Contracts

JEPA:
- `jepa.embed`

Titans:
- `titans.memorize`
- `titans.recall`

R3Mem:
- `r3mem.compress`
- `r3mem.reconstruct`

Never claim the research system is available merely because its adapter is registered. Operational status requires a successful health probe and real inference/memory output.
