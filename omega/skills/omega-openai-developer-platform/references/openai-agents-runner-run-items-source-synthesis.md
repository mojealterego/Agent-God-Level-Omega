# OpenAI Agents SDK Runner and run-items source synthesis

Phone-corpus sources:
- `Runner _ OpenAI Agents SDK.pdf`
- `StreamedRunResult _ OpenAI Agents SDK.pdf`
- `RunToolCallItem _ OpenAI Agents SDK.pdf`
- `RunToolApprovalItem _ OpenAI Agents SDK.pdf`
- `RunReasoningItem _ OpenAI Agents SDK.pdf`
- `RunRawModelStreamEvent _ OpenAI Agents SDK.pdf`
- `RunMessageOutputItem _ OpenAI Agents SDK.pdf`
- `RunInputItem _ OpenAI Agents SDK.pdf`
- `RunHandoffOutputItem _ OpenAI Agents SDK.pdf`
- `RunHandoffCallItem _ OpenAI Agents SDK.pdf`

## Runner semantics absorbed into OMEGA

The SDK Runner orchestrates an agent loop with guardrails, tool calls, sessions and tracing. A reusable Runner can hold consistent configuration across runs.

Observed loop:
1. invoke the current agent with input;
2. terminate when a valid final output is produced;
3. when a handoff occurs, continue with the new agent;
4. otherwise execute tool calls and continue.

The Runner exposes non-streaming and streaming run forms. A run may fail at a max-turn boundary or when a guardrail tripwire is raised. The source explicitly notes that only the first agent's input guardrails are run.

## Admitted-turn accounting

`StreamedRunResult.currentTurn` counts turns actually admitted to the model, not turns merely begun. Admission occurs after the max-turn check and blocking input guardrails, immediately before the model request.

Consequences:
- a handled `maxTurns: 0` boundary leaves `currentTurn` at 0;
- a blocking input guardrail before the first model request leaves `currentTurn` at 0;
- a resumed run starts from the turn count carried in its resumed state;
- state must not claim a newly admitted turn when the model request never started.

## Streaming completion

`StreamedRunResult` is an `AsyncIterable<RunStreamEvent>`. It exposes cancellation/error state and a `completed` promise so callers can await completion without consuming the stream directly. It also exposes history, input, final output, run context, raw model responses, new run items, model-output items, guardrail results and interruptions.

OMEGA therefore does not treat receipt of an early stream event as run completion. A streaming run is accepted only after the stream is fully consumed or its completion promise resolves, no terminal error/cancellation remains, required guardrails are clear, and the required final output is observed.

## Tool calls and approvals

`RunToolCallItem` represents tool calls such as function, hosted tool, computer, shell, program and apply-patch calls, with call identity/status/provider data as applicable.

`RunToolApprovalItem` is a run interruption representing a tool invocation that requires approval. It retains the raw tool item, source agent and tool identity; it can expose arguments/name and a function-tool state key.

OMEGA models every approval interruption as unresolved until an observed decision is associated with the call/state identity. A denied approval is resolved but must not be converted into an executed tool call.

## Run item identities

- `RunReasoningItem` wraps reasoning model data and is typed as `reasoning_item`.
- `RunInputItem` wraps input model items and carries an `inputId`.
- `RunMessageOutputItem` wraps assistant message output with status `completed | in_progress | incomplete`.
- `RunRawModelStreamEvent` is a raw event passed directly through from the LLM; its type is `raw_model_stream_event`, it carries the underlying `StreamEvent`, and it may carry a source. Raw model events are not equivalent to high-level run completion.
- `RunHandoffCallItem` wraps the handoff function call and its call ID.
- `RunHandoffOutputItem` wraps the matching function-call result and records source and target agents.

OMEGA validates handoff call/output correlation by call ID and requires explicit source/target identity before accepting the transition.
