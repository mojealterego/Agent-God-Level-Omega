---
name: omega-connected-services-fabric
description: Use when OMEGA should exploit the user's currently connected ChatGPT apps, cloud providers and external services as a dynamic execution fabric, selecting the strongest authenticated tool for each product-development step without assuming any connector is present.
---

# OMEGA Connected Services Fabric

## Mission

Turn the live ChatGPT tool registry into a task-local execution fabric. This skill does not grant access to services; it discovers and routes through connectors/apps that are actually exposed and authenticated in the current conversation.

## Discovery

At the start of substantial work classify each useful provider as `AVAILABLE`, `AVAILABLE_WITH_APPROVAL`, `UNAVAILABLE` or `UNKNOWN` and record the authoritative operations it exposes.

Potential lanes include, but are not limited to:

- GitHub and GitLab for source, review and CI;
- OpenAI developer/platform capabilities;
- Gemini/Vertex and Google Cloud automation;
- IBM Cloud/watsonx;
- Unity Build Automation and Google Play;
- Vercel, Render, Railway, DigitalOcean, Replit or other deployment/build providers;
- Figma/design systems and other design/product tools;
- Termux Secure MCP for local/device execution.

Never infer availability from this list.

## Routing law

For every operation select the provider with the strongest authority, structured evidence, lowest unnecessary side effects and best reversibility. Use design tools for design state, repository providers for remote source state, cloud providers for deployment state, device tools for runtime/device evidence and model providers for advisory synthesis.

## Product graph

```text
requirements
-> design/context providers
-> repository/code agents
-> tests/build/CI providers
-> cloud/runtime providers
-> device/browser E2E providers
-> store/release providers
-> observed acceptance evidence
```

Multiple providers may contribute to one product, but never duplicate writes merely to appear more autonomous.

## Secrets

Do not copy credentials from one connector into another. Use each provider's native authentication and secret store. Tool output containing credentials is never model input unless the provider contract explicitly requires a protected secret handoff.

## Completion

The fabric is successful only when it helps produce the requested artifact or external state. Merely listing connected services is not completion.
