# OMEGA Omni-Cognitive Engineering v24

Cumulative OMEGA release adding the ElevenLabs Media/Voice Plane.

## v24

- Speech Engine create/get and upstream contract validation
- secret-ref-only `ELEVENLABS_API_KEY` authentication
- explicit approval gates for credit-consuming operations
- Music `music_v2_5` plans and composition
- Text-to-Dialogue with the 2,000-character reliability bound
- Sound Effects, Voice Isolation, Voice Change and Forced Alignment
- Dubbing project/language lifecycle and signed-output download
- asynchronous Image/Video Flows create/get/download
- latency planning for streaming voice agents
- immutable local artifact SHA-256 evidence

Reality Filter, KRATOS and THOR final release gates remain in force.


## OMEGA v25.1.1 mobile-safe packaging

Active top-level mcp.json and .mcp.json are removed to avoid desktop-only ChatGPT classification. Their contents are preserved under references/. Verified app bindings live in .app.json.
