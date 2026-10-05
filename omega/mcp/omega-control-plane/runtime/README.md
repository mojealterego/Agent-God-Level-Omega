# OMEGA local cognitive runtimes — v7

The sidecars speak newline-delimited JSON RPC over stdio and are kept alive by `LocalProcessCognitiveProvider`, allowing expensive models to load once and serve repeated calls. All sidecars expose `health`; v7 also defines real smoke operations used by `omega_live_activation`.

## V-JEPA 2

`vjepa2_provider.py` uses Meta's V-JEPA 2 model through Hugging Face `AutoVideoProcessor` + `AutoModel` and calls `get_vision_features`.

Default model:

```text
facebook/vjepa2-vitl-fpc64-256
```

Install dependencies in an isolated Python environment:

```bash
python -m pip install -r runtime/requirements-vjepa2.txt
```

Environment controls:
- `OMEGA_JEPA_MODEL`
- `OMEGA_JEPA_DEVICE`

Operations:
- `jepa.embed`
- `jepa.smoke`

`jepa.smoke` creates deterministic synthetic video input, runs the real model path, and requires finite non-empty features. It does not substitute a mocked embedding.

## Titans

`titans_provider.py` uses the open-source `titans-pytorch` `NeuralMemory` implementation. It maintains runtime state inside the persistent provider process.

```bash
python -m pip install -r runtime/requirements-titans.txt
```

Operations:
- `titans.memorize`
- `titans.recall`
- `titans.smoke`

`titan.smoke` is not used; the canonical operation is `titans.smoke`, which performs a real memorize/recall cycle and verifies finite output.

This is an unofficial open-source implementation of the Titans research concept, not an official Google runtime.

## R3Mem

OMEGA intentionally includes no pseudo-R3Mem implementation. Bind an external compatible implementation through:

```bash
export OMEGA_R3MEM_FACTORY='your_module:create_r3mem_backend'
```

The factory must return an object implementing:
- `compress(text, **options)`
- `reconstruct(memory, **options)`

Operations:
- `r3mem.compress`
- `r3mem.reconstruct`
- `r3mem.smoke`

`r3mem.smoke` requires an exact compress/reconstruct round trip. A missing factory returns not-ready/failure evidence rather than fake reversible compression.

## Activation

`omega_runtime_doctor` performs read-only dependency/backend readiness checks.

`omega_live_activation` executes the full governed lifecycle:

```text
DOCTOR → REGISTER → HEALTH → SMOKE → BENCHMARK → ROUTER → CHECKPOINT
```

Only providers that pass the required smoke gate are eligible for adaptive routing.
