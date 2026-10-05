---
name: omega-ephemeral-tool-sandbox
description: Use when a one-off script is genuinely needed and can be executed in an air-gapped container, then deleted automatically instead of polluting the persistent tool library.
---

# Ephemeral Tool Sandbox

Create a throwaway script only when existing tools cannot complete a narrow task more safely.

Execution contract:
- source is written to a temporary `.omega` workspace;
- the script is executed only through the container sandbox runner;
- container networking is disabled by default;
- the source workspace is mounted read-only;
- CPU/memory limits are explicit;
- output and exit status are captured;
- temporary source is removed in a `finally` cleanup path.

Action: `ephemeral-tool-run`.

Do not execute generated code directly in the host process. If Docker/Podman is unavailable, report the sandbox capability as unavailable rather than falling back to unsafe host execution.
