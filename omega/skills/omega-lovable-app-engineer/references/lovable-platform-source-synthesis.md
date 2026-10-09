# Lovable platform source synthesis

Phone-corpus sources:
- `Security overview - Lovable Documentation.pdf`
- `Test and verify your app - Lovable Documentation.pdf`
- `Edge functions - Lovable Documentation.pdf`
- `Secrets - Lovable Documentation.pdf`
- `Database - Lovable Documentation.pdf`
- `Design systems - Lovable Documentation.pdf`
- `Lovable MCP server - Lovable Documentation.pdf`
- `Revert and restore your project with version history - Lovable D.pdf`

Portable rules absorbed into OMEGA:
- Basic and Deep security scans are useful evidence but do not guarantee complete security.
- Resolve critical security findings before public production release.
- Backend secrets never belong in browser code; server-side functions consume private credentials.
- `VITE_` values are browser-exposed build-time variables, not secrets.
- RLS and schema/access relationships must be reviewed together.
- Verification mode must match the changed surface: browser flow, isolated UI, direct edge call or edge regression test.
- Backend debugging should reproduce directly, fix, repeat, then add regression coverage.
- Code version history does not roll back database data.
- Design systems have a versioned source of truth and adherence checks; copied managed files may be replaced on update.
- Lovable MCP exposes real provider tools according to permissions; adding some connectors still requires provider UI.
- Provider-reported build, publish, analytics, database and security outcomes must remain observed evidence, never assumptions.
