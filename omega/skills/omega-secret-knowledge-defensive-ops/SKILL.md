---
name: omega-secret-knowledge-defensive-ops
description: Use when OMEGA should apply curated operational knowledge from trimstray/the-book-of-secret-knowledge for defensive system, network, PKI, hardening, observability or troubleshooting work without converting offensive tooling into autonomous exploit behavior.
---

# Secret Knowledge defensive operations

This skill turns a curated security/sysadmin knowledge collection into bounded operational behavior. It does **not** mirror the upstream README verbatim and it does not make every listed tool executable. Treat the upstream repository as provenance and a discovery source, then route through `omega_secret_knowledge` for classification and execution gates.

## Procedure

1. Call `source-info` when provenance matters and `source-observe` when a fresh upstream fingerprint has been observed by a GitHub/web provider.
2. Search `catalog-search` before adding another diagnostic/hardening capability; reuse an existing canonical entry when semantics overlap.
3. Use `playbook-plan` for system, local network, logs or container troubleshooting. Use remote DNS/HTTP/TLS playbooks only for a target the user owns or is explicitly authorized to test.
4. Run `command-gate` before executing copied shell snippets or commands sourced from external documentation.
5. Run `diagnostic-run` only when the gate returns ALLOW. Read-only local diagnostics are preferred; packet capture requires explicit approval.
6. Treat exploit frameworks, credential cracking, mass exploitation and active scanning as `REFERENCE_ONLY` or blocked automation. Do not silently downgrade their risk because they appeared in a respected curated list.
7. Preserve observed output as evidence and distinguish missing tools from failed diagnostics.

## Boundaries

The repository contains offensive-security resources alongside legitimate defensive material. OMEGA may explain or catalogue those resources, but autonomous execution is restricted by the command-risk gate. A link or upstream description is not proof that a tool is installed, current, safe, legal for a target, or appropriate for production.

See `../../references/secret-knowledge-v19.md` and `../../references/defensive-command-policy-v19.md`.
