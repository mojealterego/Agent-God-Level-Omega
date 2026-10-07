# Channel routing

1. Phone inbound/outbound: prefer live Autocalls AI or KaiCalls; CALL-E is suitable for planned one-off outbound calls.
2. RingCentral Phone: use only functions actually exposed by its connector.
3. Scheduled campaigns: use native provider schedule windows and rate limits.
4. SMS: prefer RingCentral Phone for ordinary follow-up; provider-native SMS is allowed when live tools expose it.
5. WhatsApp: use Autocalls AI only when live tools plus valid sender/template configuration are present.
6. Email: Gmail for the user's mailbox; AgentMail for agent-owned inboxes and scheduled/thread workflows.
7. Calendar: Google Calendar unless a live phone provider is the authoritative booking system.
8. Contacts: Google Contacts for legitimate lookup/update.
9. Telegram, Signal, Threema, Messenger, Instagram DM and Snapchat require a verified direct read/write adapter. Analytics or posting tools are not DM adapters.
