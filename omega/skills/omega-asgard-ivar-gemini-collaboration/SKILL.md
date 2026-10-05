---
name: omega-asgard-ivar-gemini-collaboration
description: Use when Thor or Ivar should coordinate one project across ChatGPT and Gemini using the official Gemini Interactions API, including background Deep Research, stateful continuation, provider result capture, disagreement analysis and synthesis handoff to Thor without VPN claims or fabricated Gemini Library access.
---

# Ivar Gemini collaboration

Use Ivar as the cross-model broker. ChatGPT remains the host-side worker; Gemini is reached through the official Interactions API when a real `GEMINI_API_KEY` is available to the OMEGA runtime.

## Workflow

1. Run `ivar-gemini-doctor` before attempting provider execution.
2. Create a joint project with `ivar-cross-model-start` or `ivar-project-create`.
3. For ordinary Gemini work use `ivar-gemini-start` with `mode=model`.
4. For multi-step research use `mode=deep-research`; execution is asynchronous and must use polling with `ivar-gemini-get` or `ivar-gemini-await`.
5. Record the ChatGPT-side result through `ivar-host-result` with source/evidence references.
6. Use `ivar-synthesis` only after both provider results are available. Preserve disagreements and provenance; do not erase conflicting evidence.
7. Hand the synthesis to Thor for implementation and final verification.

## Security and truthfulness

- Never store the Gemini API key in project state, plugin files, logs or prompts.
- Never request that the user paste a secret into ordinary chat when an environment/secret store is available.
- Do not claim VPN use; the bridge uses HTTPS API calls.
- Do not claim Gemini Library/Gems access through Interactions API. Existing Library data must arrive through an explicit export/authorized connector path such as Takeout/Drive.
- If the API key/provider is unavailable, return the observed unavailable state rather than fabricating a Gemini result.

See `../../references/gemini-interactions-v17.md` and `../../references/gemini-library-bridge-v17.md`.
