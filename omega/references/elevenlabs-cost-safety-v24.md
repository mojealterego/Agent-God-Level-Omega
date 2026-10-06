# ElevenLabs cost and safety gate — v24

All media operations that can consume ElevenLabs credits are guarded by `approved: true`. This applies to music composition, dialogue, sound effects, isolation, voice changing, forced alignment, dubbing generation and image/video generation. Music composition-plan creation is treated separately because the provider documents it as not consuming credits, although it remains rate limited.

The gate is intentionally local and deterministic. It does not infer approval from conversational enthusiasm. Provider plan requirements, regional availability, 402 responses and other billing constraints are surfaced as observed failures.

Secrets are environment-backed. Output files remain inside the OMEGA workspace and are returned with SHA-256 metadata.
