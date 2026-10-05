# Research Sources Used for v4 Design

Primary or near-primary sources informing the implemented abstractions:

- Google DeepMind — AlphaEvolve: evaluator-driven evolutionary program search.
  https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/
- Sakana AI — Darwin Gödel Machine: open-ended self-improving agent lineages.
  https://sakana.ai/dgm/
- Sakana AI — AB-MCTS: adaptive width/depth inference-time search.
  https://sakana.ai/ab-mcts/
- CoALA — Cognitive Architectures for Language Agents.
  https://arxiv.org/abs/2309.02427
- G-Memory — hierarchical interaction/query/insight memory for multi-agent systems.
  https://arxiv.org/abs/2506.07398
- SHIMI — semantic hierarchical memory index.
  https://arxiv.org/abs/2504.06135
- Graph of Thoughts.
  https://arxiv.org/abs/2308.09687
- Titans — neural memory learned at test time.
  https://arxiv.org/abs/2501.00663
- R3Mem — reversible compression memory.
  https://aclanthology.org/2025.findings-acl.235/
- Meta V-JEPA 2 — predictive world model.
  https://ai.meta.com/research/vjepa/
- ImandraX / CodeLogician.
  https://docs.imandra.ai/universe/code_logician/
- IEEE HDC/VSA Task Force.
  https://cis.taskforce.ieee.org/hdcvsa/

OMEGA v6 uses these sources to design interfaces and operational analogues. It does not claim to reproduce proprietary or trained systems unless their real implementation/provider is connected.

## v6 provider/federation sources

- MCP TypeScript SDK v2 client: https://ts.sdk.modelcontextprotocol.io/v2/clients/connect
- MCP protocol versions: https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions
- Imandra CodeLogician: https://docs.imandra.ai/universe/code_logician/
- ImandraX introduction: https://docs.imandra.ai/imandrax/
- R3Mem paper: https://arxiv.org/abs/2502.15957
- Meta V-JEPA: https://github.com/facebookresearch/jepa

The provider bridges are executable integration surfaces. They do not bundle third-party model weights or claim live verification without an actual connected service.

