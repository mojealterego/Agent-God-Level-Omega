---
name: omega-asgard-ivar-research-broker
description: Use when one project should be researched independently by ChatGPT and Gemini or other real research providers, then compared and handed back to Thor. Ivar is a provider broker and evidence merger, not a VPN controller and not an independent model.
---

# Ivar research broker

Ivar creates one research packet and fans it out to multiple authorized deep-research providers. The intended pair is ChatGPT and Gemini when both are actually available through host orchestration or registered MCP providers.

## Procedure

1. Register a provider reference with kind `CHATGPT`, `GEMINI` or another explicit provider.
2. Create a project containing a title, bounded brief, desired evidence and required providers.
3. Inspect `ivar-dispatch-plan`; missing providers remain `UNAVAILABLE` rather than being simulated.
4. `ivar-dispatch` executes only MCP-federated providers. Host-native ChatGPT Work/Deep Research or Gemini surfaces require the host to perform the job and record the result.
5. Preserve independent results and evidence before synthesis; do not collapse disagreement prematurely.
6. Route the resulting research package to Thor using `ivar-to-thor`.
7. Never claim VPN access, hidden access to another account, or that ChatGPT/Gemini ran if no provider result was observed.

