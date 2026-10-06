---
name: omega-elevenlabs-media-plane
description: Operate the OMEGA v24 ElevenLabs media plane with secret-ref-only authentication, explicit credit approval gates, immutable output evidence and provider-aware capability boundaries.
---

# ElevenLabs media plane

Use this skill when OMEGA needs real ElevenLabs-backed media operations rather than a planning-only response. The runtime supports Speech Engine configuration, music composition, multi-voice dialogue, sound effects, voice isolation, voice changing, forced alignment, dubbing and asynchronous image/video generation.

## Rules

1. Read the API key only from the runtime environment reference `ELEVENLABS_API_KEY`. Never place the key in prompts, logs, persistent state or generated artifacts.
2. Treat any operation that can consume provider credits or create a provider-side resource as billable. Such operations require `approved: true` at the tool boundary.
3. Preserve file provenance. Binary outputs are saved only inside the configured workspace and returned with size and SHA-256 evidence.
4. Do not infer success from request submission. Asynchronous image/video and dubbing jobs remain pending until the provider reports a terminal state.
5. Do not claim a host ElevenLabs connector is the same thing as an API-key runtime. The host connector and local REST adapter are separate execution paths.
6. Provider errors, plan restrictions, regional model access and billing failures are evidence. Return them instead of fabricating fallback success.
7. Keep Reality Filter, KRATOS and THOR final gates intact.

## Completion

An operation is DONE only when the provider response and any requested output file have been observed. A submitted asynchronous job is IN_PROGRESS until its status is re-read as completed. Missing API authentication is UNAVAILABLE, not a successful integration.
