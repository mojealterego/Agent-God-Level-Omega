---
name: omega-jepa-titans-r3mem-adapters
description: Use when OMEGA should run or connect predictive JEPA embeddings, Titans-style neural memory, or R3Mem reversible memory. Uses supervised real sidecars/providers, runtime health checks and fail-closed capability reporting instead of heuristic models presented as trained neural systems.
---

# JEPA / Titans / R3Mem Runtime Adapters v8

## Runtime doctor first

Before activating a built-in local runtime use:

```text
omega_runtime_doctor
```

`ready=false` is authoritative. Do not route work to that provider until dependencies/backend are present.

## V-JEPA 2

The built-in `jepa` preset launches `runtime/jepa_auto_provider.py`. It prefers Meta V-JEPA 2 when dependencies and weights are available, otherwise it uses a real local PyTorch JEPA-style reference backend.

It uses the Meta/Hugging Face V-JEPA 2 model interface:
- `AutoVideoProcessor`
- `AutoModel`
- `get_vision_features`
- default model `facebook/vjepa2-vitl-fpc64-256`

Capability:
- `jepa.embed`

The model weights are external and are not bundled with this plugin.

## Titans

The built-in `titans` preset launches `runtime/titans_auto_provider.py`. It uses `titans_pytorch.NeuralMemory` when installed and otherwise falls back to a real test-time fast-weight memory implementation.

Capabilities:
- `titans.memorize`
- `titans.recall`

This is an unofficial open-source implementation, not an official Google runtime. Keep that distinction in all assurance claims.

## R3Mem

The built-in `r3mem` preset accepts an external backend through `OMEGA_R3MEM_FACTORY=module:factory`. If none is supplied, it provides an exact reversible compression/reconstruction contract fallback with integrity checks. The fallback is explicitly marked `research_equivalent=false` and must never be described as the trained R3Mem neural architecture.

## Registration

After health is acceptable, use `omega_cognitive_provider action=preset` to persist the provider and then `health`/`invoke` for runtime operations.
