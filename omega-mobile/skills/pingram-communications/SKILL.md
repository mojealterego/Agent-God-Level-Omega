---
name: pingram-communications
description: Use for Pingram account workflows involving email, SMS, delivery tracking, phone numbers, sender domains, email inboxes, inbound messaging setup, and US A2P 10DLC account operations from Android, web or desktop.
---

# Pingram Communications

Use Pingram's hosted MCP as the live account/action plane and this skill as the governed orchestration layer.

## Cross-platform contract

Normal operation must not require a PC, local terminal, Docker, localhost or local `stdio`. This plugin intentionally contains no packaged `mcp.json` or `.mcp.json`.

Pingram account actions require a separately connected Pingram Custom MCP App in ChatGPT. Use the region that matches the user's Pingram account:

- US/default: `https://mcp.pingram.io`
- Canada: `https://mcp.ca.pingram.io`
- EU: `https://mcp.eu.pingram.io`

Authentication is handled by Pingram OAuth/account sign-in. Never ask the user to paste Pingram passwords, OAuth tokens or API keys into chat for the hosted MCP flow.

## Discovery first

1. Determine or confirm the Pingram account region from connected context when available.
2. Inspect the live Pingram MCP tool list before taking action.
3. Treat live tools and their schemas as authoritative; documentation summaries can lag.
4. Do not infer Voice, WhatsApp or any other capability from generic Pingram product marketing unless the live MCP exposes the matching tool.
5. Never fabricate tracking IDs, number inventory, sender verification status, A2P status, inboxes, domains or delivery outcomes.

## Supported workflow families

### Email
- send email only through a live Pingram MCP send tool;
- validate recipients, subject/body and sender context from user intent;
- after sending, retain the provider response/tracking identifier when returned;
- do not claim delivery from send acceptance alone; use delivery/log lookup when the user asks for delivery status.

### SMS
- use E.164 number formatting when the live tool requires it;
- respect opt-out and messaging-compliance state exposed by Pingram;
- never bypass carrier/A2P requirements;
- do not repeatedly message a recipient after an opt-out or explicit stop request.

### Delivery tracking
- use the exact tracking ID returned by Pingram or supplied by the user;
- distinguish accepted, queued, sent, delivered, failed and unknown states exactly as the provider reports them.

### Phone numbers
- list/search inventory before purchase;
- purchasing a number is a billing/consequential action and requires explicit confirmation unless the user's immediate request explicitly authorizes that exact purchase;
- do not release, replace or alter numbers merely to test connectivity.

### Sender domains
- inspect current domain state before add/remove/change actions;
- report DNS/verification requirements exactly as Pingram returns them;
- domain removal or externally disruptive changes require explicit confirmation.

### Email inboxes and inbound messaging
- use Pingram inbox tools only when present in live MCP;
- distinguish inbox configuration from webhook routing;
- never claim that an inbound message was received unless Pingram/provider evidence shows it.

### US A2P 10DLC
- use the live Pingram account/brand registration tools when exposed;
- never invent legal entity, EIN/tax data, business classification, campaign description or consent wording;
- account/brand submissions that create external registrations require explicit confirmation with the final submitted data.

## Consequential-action gates

Require explicit confirmation for:
- buying a phone number when the exact purchase was not already explicitly requested;
- submitting or materially modifying A2P registration data;
- deleting/removing sender domains or inboxes;
- any bulk or campaign send not explicitly requested with recipients/scope;
- any action that incurs a known charge not already clearly authorized.

A normal one-off send is authorized when the user explicitly asks to send that specific email/SMS and the recipients/content are clear.

## Evidence contract

A Pingram operation is complete only when the live MCP/provider response confirms it. For delivery claims, use delivery/log evidence rather than treating request acceptance as delivery.

See references for region selection, capability boundaries and messaging governance.
