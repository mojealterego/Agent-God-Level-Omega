# Resilience Runtime

Retries are bounded to transient classes and use exponential backoff with jitter while honoring Retry-After. Parallel command execution carries AbortSignals so latency-budget expiration terminates unfinished child processes. DAG execution validates dependencies and fails closed on cycles or failed predecessors. Load shedding preserves highest-priority tasks; degradation chooses only healthy candidates.
