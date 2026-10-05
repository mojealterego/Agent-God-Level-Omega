# Claim state model v20

OMEGA uses seven explicit claim states:

| State | Meaning |
| --- | --- |
| `OBSERVED` | directly recorded event/result |
| `VERIFIED` | declared verification procedure satisfied with referenced observed evidence |
| `INFERRED` | conclusion derived from evidence but not directly observed |
| `SPECULATIVE` | plausible hypothesis without sufficient verification |
| `UNVERIFIED` | claim lacks required evidence or referenced evidence is missing |
| `DISPROVEN` | contradictory evidence invalidates the claim in the declared scope |
| `UNKNOWN` | evidence exists but is insufficient to classify more strongly |

A claim may only be upgraded to `VERIFIED` when all referenced evidence exists and is in an observed/verified state. Provenance, authority and freshness are separately tracked because a verified retrieval from a low-authority source does not make the source authoritative.

Source authority order used by v20: project-local schema/generated contract, official documentation, official source/release, standards specification, vendor support, peer-reviewed evidence, secondary sources, community material, unknown.
