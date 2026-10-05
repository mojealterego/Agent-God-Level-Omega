---
name: omega-long-jobs-prefetch
description: Use for long jobs, webhook state and speculative prefetch workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Long Jobs, Webhook State and Speculative Prefetch

Use when external training, batch inference or analysis may run longer than a chat/tool call, or when a next-step computation can safely be prepared in advance.

Record externally running work with `job-register`, update it from a real webhook/queue consumer through `job-complete`, and inspect with `job-status`/`job-list`. The registry persists identifiers and results but does not create a public webhook endpoint by itself.

For safe local speculation, `prefetch-command` starts a command only above the configured confidence threshold; `prefetch-result` retrieves it and `prefetch-cancel` aborts it. Never speculate on destructive, paid, privacy-sensitive or externally visible operations.
