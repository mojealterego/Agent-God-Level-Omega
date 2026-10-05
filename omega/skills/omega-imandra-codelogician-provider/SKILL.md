---
name: omega-imandra-codelogician-provider
description: Use when code or invariants require real ImandraX/CodeLogician formal or neuro-symbolic verification. Configures the documented CodeLogician MCP endpoint, authenticates through an environment-backed token, probes health, discovers an actual tool, invokes it and preserves proof-scope honesty.
---

# ImandraX / CodeLogician Provider v6

Use `omega_imandra`.

## Verified preset

If no endpoint is supplied, `action=configure` uses:

```text
https://api.imandra.ai/v1beta1/tools/mcp/code_logician
```

Default token source:

```text
IMANDRA_API_KEY
```

Override with `apiKeyEnv` when necessary. The token value is not persisted.

## Operational sequence

1. make the API key available in the configured environment;
2. `configure`;
3. `health`;
4. `discover`;
5. `verify`.

`discover` selects a real CodeLogician-like tool from the server tool list or requires an explicit `toolName`.

## Assurance honesty

A successful MCP transport call is not itself a theorem. Preserve:
- provider result;
- modeled property;
- assumptions;
- counterexamples;
- proof/checking mode reported by the provider.

Never emit `FORMALLY VERIFIED` when the provider did not produce that evidence.
