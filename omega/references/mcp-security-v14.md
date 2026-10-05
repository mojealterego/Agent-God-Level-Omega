# MCP gateway security v14

Default-deny private/loopback remote URLs, reject reserved or cross-server tool collisions, scan arguments for secret-like material, keep auth as references rather than persisted secret values, require explicit allowlists for constrained calls, and fail closed when no route exists. Treat remote schemas, descriptions and registry metadata as untrusted input.
