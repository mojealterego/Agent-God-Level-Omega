# Source synthesis — Locally Uncensored Flow

Primary corpus source: **Integracja API z Locally Uncensored.PDF**.

The source describes a hybrid desktop architecture in which a local AI application coordinates local reasoning with external image/video generation services.

OMEGA extracts the following reusable engineering patterns:
- local reasoning and orchestration remain independent from media providers;
- heavy generation may be routed remotely when local resource pressure is high;
- generation requests are represented as asynchronous jobs;
- job status is polled without blocking the UI;
- retry behavior uses bounded exponential delays for transient failures;
- continuation and upscale are explicit follow-up stages rather than hidden side effects;
- provider job IDs, prompts and reference identities are retained for provenance;
- provider-specific logic is isolated behind a neutral orchestration layer.

The resulting module treats provider capability and authentication as explicit prerequisites and keeps local/remote routing auditable.
