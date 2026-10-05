---
name: omega-multimodal-evidence-fusion
description: Use to combine already-extracted evidence from text, image-derived, audio-derived, telemetry or schema modalities with explicit confidence and trust weights.
---

# Multimodal Evidence Fusion

Fuse evidence only after each modality has been processed by a real capable tool/provider.

Each item includes:
- evidence id;
- modality;
- confidence;
- trust/provenance;
- source reference.

The fusion layer computes a weighted confidence summary and preserves the constituent evidence. It must not claim that it directly perceived an image, audio file or binary stream merely because an upstream tool supplied derived features.

Action: `evidence-fuse`.

Use provider-specific multimodal tools for actual perception, then feed their verified outputs into this layer. This keeps evidence fusion separate from unsupported "one mind understands every modality" claims.
