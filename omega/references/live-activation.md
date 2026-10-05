# Live Activation v8

## Core state machine

`DISCOVER → HEALTH → REGISTER → SMOKE → BENCHMARK → ROUTE → CHECKPOINT`

## Completion modes

### Core mode (default)

Imandra and research-equivalent external runtimes are optional enhancements. Activation is `ACTIVE` when the required cognitive capabilities are backed by real verified runtimes, even if those runtimes are transparent local reference implementations.

### Strict assurance mode

Set `requireImandra=true`. Missing or failing CodeLogician keeps completion non-active.

## Runtime provenance

| Capability | Preferred runtime | Local fallback | Research-equivalent fallback? |
|---|---|---|---|
| JEPA | Meta V-JEPA 2 via Transformers | native PyTorch JEPA-style latent predictor | No |
| Titans | `titans-pytorch` NeuralMemory | native test-time fast-weight memory | No |
| R3Mem | configured trained backend | exact reversible compression contract | No |
| Formal verification | Imandra CodeLogician | none under the Imandra label | N/A |

Fallbacks exist to keep the system operational, not to inflate assurance claims. Provider `provenance` is part of the runtime evidence.

## Router admission

A runtime enters the adaptive router only after health, smoke verification and applicable benchmark hard gates pass.
