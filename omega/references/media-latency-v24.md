# Media latency model — v24

OMEGA distinguishes raw model generation latency from end-user time-to-first-audio. The latter also includes network round trips, server processing and playback buffering.

HTTP streaming is sufficient for many one-way audio generations. WebSockets are preferred when LLM text and audio are produced concurrently or when interruption/turn-taking must be coordinated in realtime.

Optimization order: measure first-audio, measure network RTT, inspect buffering, choose a low-latency model where quality permits, stream model tokens early, and propagate interruption cancellation. Do not claim a fixed latency without observed runtime measurements.
