---
name: omega-watsonx-ai-agent
description: Use when OMEGA needs IBM watsonx.ai foundation-model inference as an independent coding, review, critic, synthesis, or fallback reasoning lane with IBM Cloud project/space identity and provider-native SDK authentication.
---

# OMEGA watsonx.ai Agent

## Mission

Use IBM watsonx.ai foundation models as an independently authenticated model lane for critique, code review, architecture comparison and multi-cloud synthesis.

## Runtime

Packaged client:

```text
cloud/ibm/watsonx_agent.py
```

It uses the IBM watsonx.ai Python SDK and requires `IBM_CLOUD_API_KEY`, `WATSONX_URL`, a `WATSONX_PROJECT_ID` or `WATSONX_SPACE_ID`, and a configurable `WATSONX_MODEL_ID`.

## Evidence boundary

watsonx output is advisory model evidence. It cannot prove source changes, tests, artifacts or deployment health. Keep those acceptance predicates in repository, CI and runtime lanes.

## Security

Never send the IBM IAM API key, credentials files, signing keys or unrelated private data to the model. Credentials remain in environment/provider secret stores and are not written to output JSON.

## Completion

Record the model/deployment identity, watsonx project or space target, output artifact and successful provider response. Quota, authentication or model errors remain blockers until corrected or an authorized fallback is selected.
