# Tool routing policy

## Priority order
1. Authoritative connected provider for the target data/action.
2. Provider-native structured tool over generic browser automation.
3. Read-before-write and inspect-before-create/update.
4. Existing repository/project identity over creating duplicates.
5. Reversible mutation over destructive mutation.
6. Provider-native verification after every material write.

## Connected domains in this release
- Source control: GitHub, GitLab
- AI/API: OpenAI Platform
- Cloud/deployment: Vercel, Railway, Render, Replit
- Data/backend: Supabase, Neon
- Design: Figma
- Knowledge/docs: Notion, Google Drive
- Product/project: Linear
- Team/comms: Slack, Gmail, Google Calendar, Google Contacts, AgentMail, RingCentral Phone
- Commerce: Shopify

The host may expose only a subset depending on installation, authentication, permissions and plan.

## Fallbacks
A browser or computer-use workflow is a fallback when no provider-native tool exists. It is not a substitute for hidden credentials, bypassing permissions or inventing API access.
