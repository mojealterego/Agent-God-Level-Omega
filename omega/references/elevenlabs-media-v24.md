# ElevenLabs media integration — v24

OMEGA v24 implements a native REST adapter for current ElevenLabs media APIs and keeps the ChatGPT ElevenLabs connector as an optional host-native path. The runtime never persists the raw API key. `ELEVENLABS_API_KEY` is consumed by reference from the process environment.

Implemented operations cover Speech Engine resource create/get, Music composition plans and composition, Text-to-Dialogue, Sound Effects, Voice Isolation, Speech-to-Speech voice changing, Forced Alignment, Dubbing project/language lifecycle, and Image/Video Flows create/get/download.

Credit-consuming or provider-mutating operations require explicit approval. Asynchronous generation is not considered complete until the provider reports a completed state and, where requested, the output is downloaded and hashed.
