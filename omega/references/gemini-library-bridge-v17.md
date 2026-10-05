# Gemini Library bridge boundary — v17

The Gemini Interactions API does not claim direct access to the user's existing Gemini application Library, Gems, or historical private project collection.

OMEGA therefore separates two channels:

1. **New work** — Ivar calls Gemini through the Interactions API and records interaction IDs/results.
2. **Existing Library** — Harald/host connectors ingest an explicit user-authorized export or file source (for example Google Takeout material stored in Drive), normalize project records, and pass those records to Ivar/Thor.

No VPN, credential extraction or silent account traversal is part of this design. A future official Gemini Library connector can replace the export bridge without changing the canonical project registry.
