# DGM TechRecon mode

Primary corpus source: **Architektura Autonomicznego Systemu DGM(1).PDF**.

The source defines TechRecon as public technical reconnaissance over competitor capabilities, engineering patterns, protocols and MCP servers. OMEGA maps this role to OSINT Seeker rather than creating a duplicate agent.

TechRecon mode is limited to lawful public sources and user-authorized evidence. It may identify published features, protocols, MCP servers, release notes and architecture patterns, normalize them and score confidence. It must not bypass access controls, scrape private systems or convert marketing claims directly into implementation facts.

Normalized findings are handed to `omega-product-synthesis-director` for roadmap synthesis.
