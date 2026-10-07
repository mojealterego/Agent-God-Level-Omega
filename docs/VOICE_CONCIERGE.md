# OMEGA Voice Concierge / Customer Communications Plane

This layer makes the customer-facing voice agents part of Agent God Level OMEGA rather than a standalone plugin artifact.

Canonical source:
- omega/skills/omega-voice-concierge/
- omega/mcp/omega-control-plane/src/communications/voice-concierge.mjs

Android/mobile projection:
- omega-mobile/skills/omega-voice-concierge/
- omega-mobile/mcp/omega-control-plane/src/communications/voice-concierge.mjs

Personas: Mila, Vera, Dante and Leo.

The runtime is deterministic and PLAN_ONLY. It selects persona, channel candidates, consent/opt-out gates and handoffs. Real calls/messages/bookings remain provider-backed actions and are complete only after observed provider confirmation.

Known direct channel candidates:
- phone: Autocalls AI, KaiCalls, CALL-E, RingCentral Phone depending on live host capabilities
- SMS: RingCentral Phone, KaiCalls or Autocalls AI when exposed
- WhatsApp: Autocalls AI when exposed and configured
- email: Gmail / AgentMail
- appointments: Google Calendar or a live provider calendar integration

No direct read/write connector is assumed for Telegram, Signal, Threema, Messenger, Instagram DM or Snapchat.
