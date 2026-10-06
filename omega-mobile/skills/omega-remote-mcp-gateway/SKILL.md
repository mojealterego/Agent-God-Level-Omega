---
name: omega-remote-mcp-gateway
description: Use when OMEGA must expose one production Streamable HTTP MCP backend on Cloud Run for ChatGPT, Gemini, or another standards-compliant MCP client while preserving the existing local Termux tunnel lane.
---

# OMEGA Remote MCP Gateway

## Mission

Provide one remotely reachable OMEGA MCP endpoint for clients that support standard Streamable HTTP MCP. The gateway runs on Cloud Run and reuses the same governed OMEGA control-plane implementation as the stdio runtime instead of maintaining a divergent second tool implementation.

## Endpoint contract

The production surface is:

```text
GET  /healthz
GET  /readyz
GET  /.well-known/oauth-protected-resource
GET  /.well-known/oauth-protected-resource/mcp
POST /mcp
```

`/mcp` is protected by OAuth bearer verification in production. Health and RFC 9728 metadata remain public so clients and load balancers can discover and probe the service without receiving private tool results.

## Cloud Run contract

Use the service in `mcp/omega-control-plane`. The container listens on `$PORT` and binds `0.0.0.0`. Deploy the Cloud Run service with network ingress reachable by the intended MCP clients, while enforcing authentication at the application resource-server layer. Do not confuse Cloud Run reachability with authorization.

## Shared backend rule

ChatGPT and Gemini must point at the same canonical HTTPS `/mcp` URL when both clients support the feature. They receive the same tool implementation, policy semantics, and evidence envelope. Client-specific behavior belongs in the client, not in duplicated backends.

## Termux coexistence

The OpenAI Secure MCP Tunnel remains a separate local/private execution lane. Do not remove `termux/omega-termux`, the tunnel profile, or the stdio server. Prefer the remote gateway for shared cloud work and use Termux for phone-local ADB, device logs, local build inspection, or other device-bound actions.

## Completion

A remote-MCP deployment is complete only after the exact Cloud Run revision is healthy, OAuth metadata is reachable, unauthenticated `/mcp` requests are rejected, an authenticated MCP client can list tools, and at least one read-only tool invocation succeeds.

## Deployment entry points

Use:

```text
cloud/google/remote-mcp/bootstrap-gcp.sh
cloud/google/remote-mcp/deploy.sh
cloud/google/remote-mcp/verify-authenticated.sh
```

The bootstrap/deploy split is deliberate: Google Cloud identity and WIF can be established independently of the OAuth authorization server. A deployment is not complete until the authenticated verifier successfully performs MCP `tools/list` and observes the core OMEGA tools.
