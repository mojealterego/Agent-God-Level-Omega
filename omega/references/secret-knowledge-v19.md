# Secret Knowledge integration — v19

## Upstream provenance

- Repository: `trimstray/the-book-of-secret-knowledge`
- URL: https://github.com/trimstray/the-book-of-secret-knowledge
- License: MIT
- Default branch: `master`
- README SHA observed during integration: `2c1b9e4ee145961275b20df550d190446a65e579`
- Repository push timestamp observed during integration: `2024-11-19T14:00:38Z`

The repository is primarily a large curated README covering CLI/GUI/web tools, systems/services, networking, containers/orchestration, manuals, hardening, troubleshooting, OSINT, penetration-testing resources, shell one-liners and security news/resources.

## What v19 actually adopts

OMEGA does not copy the whole catalogue into executable tools. It compiles the useful patterns into:

- defensive diagnostics for system/network/log/container state,
- TLS/PKI and SSH-hardening knowledge categories,
- security audit/hardening catalogue entries,
- process/performance tracing categories,
- web-log/observability categories,
- OSINT as authorized reference-only discovery,
- tool inventory and source-version observation,
- risk classification before shell execution.

## Explicit non-adoption

Tools and recipes centered on exploitation, credential extraction/cracking, mass exploitation or active scanning remain `REFERENCE_ONLY`, require a separate authorized security workflow, or are hard-blocked from autonomous execution. This includes classes represented upstream by Metasploit, sqlmap, mimikatz, hashcat, AutoSploit and similar tooling.

The upstream repository is a discovery source, not a guarantee that every external link is current, available or appropriate.
