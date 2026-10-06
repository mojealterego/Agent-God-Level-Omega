# Cross-client runtime

ChatGPT and Gemini can share the same HTTPS MCP backend when their client surfaces support remote/custom MCP. ChatGPT may additionally use the existing OpenAI Secure MCP Tunnel to Termux for device-local execution. Each lane is discovered independently at runtime.
