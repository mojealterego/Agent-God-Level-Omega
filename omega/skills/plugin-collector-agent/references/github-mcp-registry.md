# GitHub MCP Registry scan

Canonical source pages supplied by the user:

- https://github.com/mcp?page=1
- https://github.com/mcp?page=2
- https://github.com/mcp?page=3
- https://github.com/mcp?page=4
- https://github.com/mcp?page=5
- https://github.com/mcp?page=6
- https://github.com/mcp?page=7

The registry snapshot inspected when this skill was authored reported **164 MCP servers**. Treat the live registry count as authoritative on later scans because the catalog changes.

## Per-server classification

For each entry capture when visible:
- server/product name;
- publisher;
- short description;
- registry/detail URL;
- whether docs explicitly state `remote`, `hosted`, HTTPS/Streamable HTTP/SSE, or `stdio/local`;
- authentication requirements;
- whether a ChatGPT-native plugin/app can be found by exact provider/server search.

Classify into:
- `chatgpt-native`
- `remote-hosted-candidate`
- `local-stdio`
- `hybrid-or-unknown`

## Important distinction

GitHub Registry `Install` means the MCP registry offers installation guidance/integration metadata for MCP-capable clients. It does **not** guarantee one-click installation in ChatGPT, Android compatibility, or a verified ChatGPT `app_id`.

## Examples visible in the supplied registry pages

Examples include Markitdown, Netdata, Context7, Chrome DevTools MCP, Playwright, GitHub, Serena, Unity, Desktop Commander, Firecrawl, Notion, Azure MCP Server, Microsoft Fabric MCP Server, DBHub, Supabase, Bright Data, Tavily, Apify, Azure DevOps, GitLab MCP, Figma MCP Server, Stripe, Terraform, MongoDB, SearXNG Search, Atlassian Rovo MCP, StackQL MCP Server, Vercel Next Dev Tools, Sentry, Elasticsearch, Neon, SonarQube MCP, Chroma, Todoist, Monday, Zapier, Mapbox, Postman and Hugging Face.

Always rescan live pages rather than treating this example set as complete.
