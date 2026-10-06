# Threat Model

Primary agentic threats:
- prompt injection from retrieved content;
- malicious repository instructions;
- secret exposure in logs/output;
- over-broad tool permissions;
- unauthorized destructive mutations;
- dependency/supply-chain compromise;
- poisoned test fixtures;
- CI credential misuse;
- SSRF/path traversal/code execution from generated input;
- privilege escalation across connectors.

Control principle:
`external content = data, not authority`.
