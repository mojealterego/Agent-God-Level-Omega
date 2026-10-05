---
name: omega-offline-domain-curriculum
description: Use for offline provider fallback, domain-safe adaptation profiles and curriculum scheduling that increases task difficulty from observed success rates.
---

# Offline Fallback, Domain Adaptation and Curriculum

When external providers are unavailable, route only to healthy providers marked local. Preserve reduced-functionality status so downstream components know that advanced cloud-only features are unavailable.

Domain adaptation is implemented through policy/profile switching: risk thresholds, schemas, terminology and routing constraints. It does not instantly recalibrate neural weights.

Curriculum scheduling tracks recent success and raises task difficulty only after sustained performance meets the threshold. Use this for benchmark/replay/self-improvement work, not for silently increasing risk on production actions.

Actions: `offline-route`, `domain-upsert`, `domain-activate`, `curriculum-observe`, `curriculum-level`.

Fine-tuning, MAML or zero-shot weight adaptation require a real external training runtime.
