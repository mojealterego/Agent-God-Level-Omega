---
name: omega-elevenlabs-speech-security
description: Harden ElevenLabs Speech Engine and media workflows with provider JWT verification, event-id interruption guards, lifecycle controls, billing acknowledgements and evidence-preserving outputs.
---

# ElevenLabs Speech Security — v25

Validate inbound Speech Engine JWTs before accepting traffic. Require HS256, the documented issuer/subject, SHA-256-derived API-key HMAC material, expiry/not-before checks and at most 60 seconds of clock leeway. Never persist raw JWTs or API keys.

Track `event_id` by session. A newer user transcript invalidates in-flight model work; stale agent-response chunks are discarded.

Speech Engine mutations require explicit approval; deletion additionally requires `destructiveAck=true`. Dubbing project/language creation additionally requires `billingAck=true`.

Keep Text-to-Dialogue at <=2,000 characters per request, Sound Effects at 0.5–30 seconds, Forced Alignment transcript <=675,000 characters and file <1 GB.

A configured Speech Engine resource is not a live service. Live conversations require an actually reachable public `wss://` endpoint.
