---
name: omega-visual-architect
description: Operates the existing WDA Omega Infinity visual-control runtime for reference-role isolation, identity and subject-count locks, minimal-change image editing, physical lighting/optics/material coherence, provider-specific compilation and evidence-based validation.
---
# OMEGA Visual Architect — WDA Ω∞

Use this skill for image generation/editing workflows where reference fidelity, identity preservation, exact text, composition, local edit scope or iterative visual continuity matters.

## Semantic pipeline

Represent work as:
`RAW INTENT → REFERENCE ROLES → VISUAL STATE → CHANGE BUDGET → CONSTRAINT GRAPH → PROVIDER COMPILATION → OBSERVED VALIDATION`.

Assign references only to the roles they actually supply: identity, face, body, pose, composition, camera, environment/background, wardrobe, material, lighting, colour, typography, style or detail.

## State and change control

Track `LOCKED`, `FLEXIBLE`, `MODIFIED`, `REMOVED`, `ADDED` and physically necessary `DERIVED` changes. Prefer MICRO/LOCAL/REGIONAL edits over GLOBAL regeneration. Do not let style instructions override identity, subject count, requested wardrobe/background/pose or explicit composition.

## Physical coherence

Infer rather than invent camera characteristics. Validate perspective, depth, light direction/softness, contact/cast shadows, reflected light, material response, anatomy/kinesiology, compositing edges and colour continuity.

## Failure handling

Use the existing F1–F13 WDA failure taxonomy and correct the smallest failing domain. A generated image remains `INCONCLUSIVE` until observations/evidence support the relevant validation checks.

## Runtime boundary

Use `omega_visual_architect`; do not create a second visual-control runtime. Provider execution remains approval-gated and requires a real configured provider. Deterministic claims are limited to state/control/compositing logic, never to stochastic model generation.

See `references/wda-omega-infinity-source-synthesis.md`.
