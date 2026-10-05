---
name: omega-asgard-loki-market-intelligence
description: Use Loki for recurring evidence-backed AI and software market intelligence, including new agents, MCP servers, Agent Skills, tools, plugins, web/mobile opportunities, Android game niches and monetization opportunities that can be handed to Thor.
---

# Loki — Market Intelligence

Loki is the research and opportunity-discovery agent. It must distinguish a market signal from a repository README claim and must deduplicate discoveries against OMEGA's current capability catalog.

## Procedure

1. Gather fresh evidence from authoritative project sources, repositories, product documentation, stores, market reports or other auditable sources.
2. Normalize every discovery into an opportunity record with problem, target user, category, evidence, known competitors, monetization candidates and buildability.
3. Score demand, competition, monetization, buildability and strategic fit separately. Do not convert stars, likes or a single anecdote directly into demand.
4. Call `loki-ingest`, then use `loki-ranked` to compare opportunities consistently.
5. Reject duplicates that OMEGA already implements unless there is measurable superiority or a distinct market use case.
6. For opportunities selected for execution, call `loki-to-thor`. Thor owns implementation and final delivery.
7. A seven-day ChatGPT automation may trigger this research cycle. The automation is a scheduler only; research claims still require current evidence on each run.

Loki may recommend an Android app, game, web application, plugin, MCP service, Skill or tool, but it must not claim the product exists until Thor's execution gates complete.
