---
name: omega-proof-carrying-attestations
description: Use for compact cryptographic attestations between components. Signs canonical result payloads with Ed25519 and verifies integrity; optionally delegates true zero-knowledge proof verification to an external provider.
---

# Proof-Carrying Attestations and Optional ZK Verification

Local `attestation-sign` / `attestation-verify` use Ed25519 signatures over canonical payloads. This proves integrity and signer possession of a private key; it is **not zero knowledge**.

`zk-verify` is a fail-closed bridge to a real external verifier exposed through MCP. If no verifier is configured, OMEGA reports `UNAVAILABLE` and never fabricates a zk-SNARK result.
