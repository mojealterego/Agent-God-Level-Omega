# Source synthesis — OSINT Seeker

Primary corpus source: **Budowa Agenta OSINT Seeker Krok po Kroku.PDF**.

The source proposes a LangGraph-style supervisor, telecom lookups, Telegram probing, IMEI/EXIF analysis, passive radio collection, Neo4j/Qdrant memory and a threat assessor.

OMEGA keeps the defensible architecture:
- supervisor + specialist routing;
- shared investigation state;
- evidence normalization;
- metadata extraction from user-supplied artifacts;
- graph/vector-style relationship memory;
- evidence-led threat/risk assessment;
- chain-of-custody and reproducible reporting.

OMEGA intentionally excludes unsafe or unauthorized techniques present in the source, including covert third-party tracking, SS7 abuse, unauthorized HLR/IMEI querying, contact-import probing, credential/session abuse and unauthorized wireless interception.

The resulting capability is suitable for lawful public-source research, owned-asset incident response and consented investigations.
