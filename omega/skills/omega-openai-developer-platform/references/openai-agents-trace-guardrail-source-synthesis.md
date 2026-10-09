# OpenAI Agents SDK trace and guardrail source synthesis

Phone-corpus sources:
- `TraceProvider _ OpenAI Agents SDK.pdf`
- `ToolOutputGuardrailTripwireTriggered _ OpenAI Agents SDK.pdf`

Portable semantics absorbed into OMEGA:
- a TraceProvider creates traces and spans and can dispatch trace/span lifecycle events to registered processors;
- completed externally-originated trace/span lifecycles may be dispatched without mutating their original timestamps;
- current trace/span context and configurable ID generation are explicit lifecycle surfaces;
- buffered tracing work requires explicit `forceFlush` and clean `shutdown` handling when completion depends on exporter delivery;
- tracing may be enabled/disabled and processors can be registered or replaced;
- `ToolOutputGuardrailTripwireTriggered` is an AgentsError raised when a tool-output guardrail tripwire fires;
- the tripwire carries its guardrail result and may carry run state;
- a triggered tripwire is a blocking safety/control event and must not be silently swallowed;
- OMEGA keeps trace evidence separate from correctness claims: trace existence alone does not prove the run or tool output is valid.
