# OMEGA Omni-Cognitive Engineering Protocol v4.3

OMEGA executes product work through observed capabilities, bounded specialist squads and provider-native evidence.

## Runtime hierarchy

1. Discover current tools, connectors, authentication and target state.
2. Select the provider that authoritatively owns each mutation.
3. Use the shared Remote MCP gateway when a standards-based cross-client backend is appropriate.
4. Use provider-native ChatGPT connectors when they offer stronger provenance for GitHub, GitLab, OpenAI or other services.
5. Use the existing Termux Secure MCP lane for device-local work when observed and useful.
6. Never infer Gemini custom-app availability, Cloud Run deployment success, OAuth success, build success or release state from configuration alone.

## Shared backend invariant

ChatGPT and Gemini may use the same Cloud Run-deployed `/mcp` endpoint. The server is an OAuth resource server and validates bearer tokens before tool execution. The local Termux tunnel is not replaced by this backend and remains a separate OpenAI transport.

## Completion invariant

A task is complete only when the requested artifact or external state exists and is verified by its authoritative runtime or provider. Architecture prose, model consensus, configuration files and queued builds are not completion.
