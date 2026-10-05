---
name: omega-information-bottleneck-world-replay
description: Use for macrostate compression and bounded nested-world replay. Ranks explicit macro mappings by predictive information versus complexity and replays real scenarios in an air-gapped sandbox.
---

# Information Bottleneck and World Replay

`information-bottleneck` compares supplied macro mappings using discrete predictive mutual information minus a configurable complexity penalty.

`world-replay` executes bounded scenario commands inside the existing no-network container sandbox and reports observed pass rates. It does not simulate an entire universe or claim 1000x time acceleration.
