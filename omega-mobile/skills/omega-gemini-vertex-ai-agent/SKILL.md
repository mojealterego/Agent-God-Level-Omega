---
name: omega-gemini-vertex-ai-agent
description: Use when OMEGA needs Gemini as an independent coding, architecture, review, adversarial-critic, or synthesis lane through Google Cloud Vertex AI using the Google Gen AI SDK and ADC/WIF authentication.
---

# OMEGA Gemini Vertex AI Agent

## Mission

Use Gemini through Vertex AI as an independent model lane inside OMEGA. It can critique architecture, review diffs, synthesize alternatives, analyze text inputs, and return structured reasoning artifacts to the main orchestrator.

## Runtime

Packaged client:

```text
cloud/google/gemini_vertex.py
```

The default backend is Vertex AI and expects Google Application Default Credentials, `GOOGLE_CLOUD_PROJECT`, and `GOOGLE_CLOUD_LOCATION`. The model is configurable through `GEMINI_MODEL` or `--model` so OMEGA is not pinned to one model generation.

## Evidence boundary

Gemini output is model evidence only. It cannot satisfy compile, test, device, security, deployment, or store-release predicates unless those are independently observed by the corresponding execution lane.

## Privacy and secrets

Do not send credentials, signing material, private customer data, or unrelated repository content to Gemini. Build narrow prompts from the files and diff slices required by the task.

## Completion

Record the model ID, backend, prompt input provenance, output file and invocation success. Treat provider errors, quota errors and safety blocks as observed failures instead of fabricating a response.
