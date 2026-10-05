---
name: omega-latent-vector-messaging
description: Use when cooperating components can exchange compact numeric embeddings or feature vectors through an explicit typed envelope instead of verbose text payloads.
---

# Latent Vector Messaging

This mechanism provides a typed transport for embeddings/features between cooperating agents or services.

Requirements:
- fixed declared dimensionality;
- source and destination identifiers;
- vector kind/provenance;
- no implicit interpretation beyond the agreed encoder/decoder contract;
- reject dimension mismatches;
- preserve audit metadata when vectors influence a consequential decision.

Actions: `vector-send`, `vector-receive`.

The bus explicitly rejects messages claiming to be raw model weights. Different model families do not automatically share a meaningful latent space. Cross-model vector interoperability requires an actual shared encoder, projection layer or protocol.
