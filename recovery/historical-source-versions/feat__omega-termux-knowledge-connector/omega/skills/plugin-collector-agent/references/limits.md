# Platform limits

Current Plugin Management behavior relevant to this agent:

- `search_plugins` is search/query based, not a guaranteed exhaustive list-all API.
- `suggest_plugins` can contain at most 10 plugin IDs per call.
- `suggest_plugins` should be called at most once per conversation turn.
- Installing or connecting a plugin always requires the user's explicit action in the ChatGPT UI.
- The agent must not claim a plugin is installed merely because it was suggested.
- Account authorization/OAuth may still be required after installation.
