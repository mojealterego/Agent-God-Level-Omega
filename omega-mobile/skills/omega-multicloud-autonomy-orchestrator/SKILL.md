---
name: omega-multicloud-autonomy-orchestrator
description: Use when OMEGA must coordinate OpenAI, Gemini on Vertex AI, Google Cloud, IBM Cloud/watsonx, GitHub/GitLab, and optional Termux as one evidence-driven multi-cloud execution graph with failover and provider-specific verification.
---

# OMEGA Multi-Cloud Autonomy Orchestrator

## Mission

Coordinate multiple cloud and model providers without treating them as interchangeable or assuming that a configured workflow proves access. Each lane owns its own authentication, quota, deployment state, artifact identity, model output, and failure evidence.

## Execution graph

```text
intent
 -> capability discovery
 -> authoritative repository/CI lane
 -> model routing (OpenAI / Gemini Vertex / watsonx)
 -> build/deploy lane (GCP / IBM / Unity / Play)
 -> provider-native verification
 -> cross-provider evidence merge
 -> completion gate
```

## Routing

Use OpenAI capabilities already exposed by ChatGPT for OpenAI-native work. Use `omega-gemini-vertex-ai-agent` for Gemini through Vertex AI when Google ADC/WIF is valid. Use `omega-watsonx-ai-agent` when IBM watsonx credentials and project/space identity are valid. Use provider cloud agents for deployment and infrastructure state.

Do not duplicate the same mutation across providers unless the task explicitly requires active-active, failover, migration, or independent verification.

## Consensus and criticism

For consequential architecture or code-review tasks, the orchestrator may request independent critiques from Gemini and watsonx in addition to the primary OpenAI reasoning lane. External model output is advisory evidence, not proof that code compiles or a deployment is healthy.

## Failure and failover

A provider failure can trigger an alternate lane only when the requested acceptance criterion can be satisfied there without changing product semantics. Preserve the original failure evidence and record which provider became authoritative for the final state.

## Security

Never copy credentials between providers. Google uses ADC/WIF or provider secret stores; IBM uses IAM/service-ID credentials or trusted compute identity; OpenAI credentials remain in OpenAI-approved setup flows. Never put secrets in prompts, repositories, artifacts, logs, or evidence ledgers.

## Completion

Completion requires provider-native observed evidence for every requested state: exact revision, build/deploy identity, endpoint health, artifact checksum, model invocation result where relevant, and release target.
