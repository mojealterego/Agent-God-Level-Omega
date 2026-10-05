# OMEGA MCP Control Plane v19

OMEGA v19 extends the existing ASGARD control plane with a defensive operational-knowledge layer distilled from `trimstray/the-book-of-secret-knowledge`.

New surface: `omega_secret_knowledge`.

Implemented mechanisms:
- curated defensive knowledge catalog with upstream provenance,
- command-risk classification and hard blocking of exploit/credential/destructive automation,
- safe local diagnostic playbooks,
- explicit authorization for remote DNS/HTTP/TLS diagnostics,
- local tool inventory without auto-enabling offensive frameworks,
- upstream source fingerprint/update observation.

Offensive frameworks and credential-cracking utilities remain reference-only. Active scanning is not autonomously executed.


## OMEGA v20 Reality Filter Kernel

OMEGA v20 adds `omega_reality_filter`, a formal epistemic release gate connected to the Evidence Ledger, source-of-truth verification, Decision Trace Audit, Kratos secret checking and Thor finalization. It separates observed/verified claims from inference, speculation and unknowns; isolates prompt injection from external content; audits unsupported absolute language and metacognitive claims; checks production-code completeness; records corrections; and blocks `DONE` when required evidence, tests, builds, artifacts or security gates are missing.

The kernel does not claim access to hidden chain-of-thought and does not allow a plugin-level policy to outrank host/system policy.
