# ElevenLabs hardening — OMEGA v25

v25 hardens v24 with Speech Engine HS256 JWT verification, per-session event-id interruption/stale-output guards, list/update/delete lifecycle operations, Music Detailed multipart handling, Text-to-Dialogue timestamps, corrected Sound Effects duration/prompt-influence validation, conservative Forced Alignment file bounds, and explicit dubbing billing acknowledgement.

Provider authentication remains an environment reference through `ELEVENLABS_API_KEY`. Raw keys and JWTs are not persisted. A configured Speech Engine resource does not prove a reachable WebSocket deployment; live voice still requires an actual public WSS host.
