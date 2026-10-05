---
name: omega-structured-output-schema
description: Use for structured outputs and strict validation workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Structured Outputs and Strict Validation

Use at every machine-to-machine boundary where malformed data could cascade into runtime failure.

Prefer the host/provider's native structured output or constrained decoding when it is actually supported. Independently validate the resulting object against a schema before applying side effects. `schema-validate` implements a deterministic JSON-schema subset for object types, required fields, additional-properties rejection, arrays, string length, numeric ranges and enums.

The MCP tool surfaces are additionally validated by Zod before reaching the control plane. Invalid input should fail early with a precise field path; do not coerce corrupted structures merely to continue execution.
