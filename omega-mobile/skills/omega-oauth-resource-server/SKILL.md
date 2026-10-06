---
name: omega-oauth-resource-server
description: Use when OMEGA Remote MCP must authenticate ChatGPT, Gemini, or another client through an external OAuth 2.1/OIDC authorization server with RFC 9728 metadata and verified bearer tokens.
---

# OMEGA OAuth Resource Server

## Mission

Protect the shared OMEGA Remote MCP endpoint without embedding user credentials, cloud service-account keys, or long-lived secrets in the plugin or container image.

## Trust model

The MCP service is a resource server, not an authorization server. Use an established OAuth/OIDC identity provider. The resource server verifies every bearer token and publishes protected-resource metadata describing the authorization server and supported scopes.

Supported verifier modes:

```text
jwt           OIDC discovery + JWKS + issuer/audience/expiry validation
introspection RFC 7662 token introspection using protected client credentials
none          tests/local development only; production startup rejects it
```

Required production configuration for JWT mode:

```text
OMEGA_AUTH_MODE=jwt
OMEGA_OAUTH_ISSUER=https://issuer.example/
OMEGA_OAUTH_AUDIENCE=https://omega.example/mcp
OMEGA_OAUTH_SCOPES=omega.mcp
```

`OMEGA_OAUTH_JWKS_URI` can override discovery when required. Introspection credentials must come from the runtime secret store.

## Client interoperability

ChatGPT discovers the OAuth configuration from RFC 9728 metadata and the `WWW-Authenticate` challenge. Gemini custom apps use the same MCP URL and can follow the server's OAuth flow when the account/client surface supports custom MCP apps. Do not create separate auth policies for the two clients unless provider requirements force it.

## Verification

Reject tokens with invalid signature, issuer, audience, expiry, missing required scope, or inactive introspection state. Never log the bearer token. Tool handlers may inspect the normalized authenticated client ID and scopes, but not raw credential material.

## Completion

Authentication is complete only when an unauthenticated `/mcp` request returns an OAuth challenge and an authenticated request reaches the MCP handler with verified caller identity and scopes.
