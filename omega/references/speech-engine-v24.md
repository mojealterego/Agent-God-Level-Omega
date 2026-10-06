# Speech Engine architecture — v24

Speech Engine is treated as a transport layer around an OMEGA-controlled LLM/service. ElevenLabs connects to the configured public WebSocket endpoint and sends transcript events; the server streams text responses back for synthesis. The upstream endpoint must use `wss://` in OMEGA configuration.

The runtime exposes the verified upstream event contract, configuration creation and resource reads. Deployment of the long-lived WebSocket server is deliberately separated from configuration because reachability, TLS, authentication and process lifecycle belong to the selected host environment.

Latency is measured end to end. Model inference latency alone is not equivalent to time-to-first-audio. Streaming should begin as early as practical and interruption cancellation should terminate in-flight model work.
