---
name: omega-resilience-backoff-latency
description: Use for resilience, backoff and latency budgets workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Resilience, Backoff and Latency Budgets

Use for rate limits, flaky external APIs, overload, slow tools, live-response deadlines and graceful partial results.

`retry-plan` implements bounded retry decisions for transient HTTP/network classes and exponential backoff with jitter, honoring explicit Retry-After values. Never retry authorization, validation or deterministic client errors merely to hide them.

`parallel-run` executes independent commands concurrently under a wall-clock budget and aborts unfinished processes at the deadline, returning observed partial results. Use load shedding and graceful fallback for non-critical work.

Every retry loop must have a maximum attempt count, time/cost budget and circuit-break condition.
