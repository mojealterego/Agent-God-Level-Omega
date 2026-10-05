---
name: omega-android-live-feedback
description: Use for Android/mobile verification. Prefer accessibility snapshots with epoch-scoped refs, execute only against the latest snapshot, and preserve screenshots/logs/traces as evidence. Use agent-device when actually installed.
---

# Android live feedback loop

## Procedure

1. Inspect the existing OMEGA capability catalog before adding anything new.
2. Reuse an existing capability when semantics and safety boundaries already match.
3. Add a new capability only when it contributes a distinct executable mechanism.
4. Keep discovery metadata concise; load detailed references only when activated.
5. Verify consequential behavior with tests or observed tool output.
6. Never convert an external project claim into an OMEGA capability claim without local or provider evidence.

See `../../references/ecosystem-research-v14.md` for provenance and `../../references/dedup-policy-v14.md` for canonicalization rules.
