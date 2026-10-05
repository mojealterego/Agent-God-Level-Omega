# Gemini Interactions API bridge — v17

OMEGA v17 integrates Gemini through Google's official Interactions API endpoint:
`https://generativelanguage.googleapis.com/v1beta/interactions`.

Implemented operations:
- standard model interaction;
- optional `previous_interaction_id` continuation;
- background execution;
- Deep Research agent submission;
- polling by interaction ID;
- result text extraction;
- fail-closed behavior without `GEMINI_API_KEY`;
- no API-key persistence.

The bridge defaults to `gemini-3.8-flash` for ordinary interactions and `deep-research-preview-04-2026` for Deep Research, matching the current Google documentation observed during implementation. Model/agent IDs remain configurable because provider availability can change.

Official documentation provenance used during implementation:
- https://ai.google.dev/gemini-api/docs/interactions-overview
- https://ai.google.dev/gemini-api/docs/background-execution
- https://ai.google.dev/gemini-api/docs/deep-research
