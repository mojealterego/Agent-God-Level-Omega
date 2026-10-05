# ASGARD v18 — multi-account tunneling

## Purpose

The tunnel broker provides account isolation and deterministic routing across many authenticated identities. It is not a geographic VPN and does not bypass provider access controls.

## Supported patterns

- **Gemini** — independent environment-backed API key profiles, project affinity, health/concurrency routing.
- **ChatGPT** — host-profile descriptors for selecting a user-visible host session when the host supports that capability. The local MCP cannot silently log into or switch private ChatGPT accounts.
- **GitHub** — isolated `GH_CONFIG_DIR` profiles or env-token references passed only to the invoked subprocess.
- **Other providers** — host connector or MCP federation references when an authenticated connector exists.

## Routing

Eligibility requires `active=true`, `authorized=true`, available concurrency, no active cooldown and health other than `DOWN`. A score combines configured priority, health and observed reliability while penalizing current load. An affinity key pins related work to the same account while it remains eligible.

## Secret handling

Only names of environment variables or external profile references are persisted. Secret values are resolved at execution time and never returned by account-list, account-route or state-save.

## Limits

This mechanism does not combine provider subscriptions, defeat rate limits, impersonate account owners, transfer private data between accounts without authorization, or provide direct enumeration of Gemini Library/Gems.
