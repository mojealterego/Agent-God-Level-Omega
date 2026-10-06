---
name: omega-speech-engine-realtime
description: Configure and govern ElevenLabs Speech Engine realtime voice sessions, including secure WebSocket endpoints, streamed LLM responses, interruption handling and latency measurement.
---

# Speech Engine realtime

Use this skill for bring-your-own-LLM voice agents. ElevenLabs performs speech recognition and speech synthesis while OMEGA or another server owns conversation logic and tool routing.

## Contract

- Configure only a publicly reachable `wss://` server endpoint. Plain `ws://` is rejected by the OMEGA runtime.
- Treat ElevenLabs as the WebSocket client connecting to the user-controlled server. The upstream contract includes init, transcript, ping, close and error events; the server returns agent-response chunks and pong events.
- Stream LLM output as soon as it becomes available. Do not wait for the full model answer when low-latency voice interaction is required.
- Cancellation on user interruption must propagate to the in-flight LLM task. The exact cancellation primitive depends on the server SDK/runtime.
- Measure time-to-first-audio separately from model inference latency. Network RTT and playback buffering are distinct contributors.
- Put tool calling, memory and context policy on the OMEGA/server side so voice transport cannot override system policy.
- Screen transcript content through prompt-injection defenses before allowing it to influence privileged actions.

## Boundary

OMEGA can create and inspect Speech Engine resources through the ElevenLabs API and validate the upstream protocol contract. A public WebSocket deployment still requires an actual reachable runtime such as Cloud Run, another cloud host or an authorized local tunnel.
