# Living advanced framework registry

This is an architectural registry, not a claim that every item is installed or connected.

## Protocols and app surfaces
- Model Context Protocol (MCP)
- MCP Apps / ext-apps
- OpenAI MCP Extensions
- WebMCP
- Agent-to-Agent (A2A)
- OpenAPI / JSON Schema tool contracts
- OAuth 2.1 / PKCE / OIDC / DCR
- webhooks, event streams, SSE and WebSockets

## MCP/app implementation frameworks
- Official MCP TypeScript SDK
- Official MCP Python SDK
- FastMCP
- Skybridge
- Noodle Seed
- OpenAI Apps/Extensions SDK patterns
- Vercel AI SDK MCP integration
- Cloudflare Workers/Durable Objects MCP patterns

## Durable agent frameworks
- Eve (Vercel)
- LangGraph
- Microsoft AutoGen
- Microsoft Semantic Kernel
- CrewAI
- PydanticAI
- Mastra
- Google Agent Development Kit (ADK)
- AWS Strands Agents
- Agno
- smolagents
- Atomic Agents

## Reasoning / optimization / programmatic LLM systems
- DSPy
- LlamaIndex workflows/agents
- LangChain
- Haystack
- graph-of-thought / tree-of-thought orchestration patterns
- reflection / critic / verifier loops
- planner-executor and supervisor-worker patterns

## Workflow and durable execution
- Temporal
- Trigger.dev
- Inngest
- Prefect
- Dagster
- Apache Airflow
- n8n
- Make
- Zapier
- Pipedream

## Browser/computer execution
- Playwright
- Puppeteer
- Selenium
- browser-use
- Browserbase
- Stagehand
- cloud-computer / computer-use patterns

## Tool/auth integration layers
- Vercel Connect
- Composio
- Arcade
- Nango
- Auth0
- OAuth/OIDC native provider integrations

## Data / retrieval
- PostgreSQL / pgvector
- Supabase
- Neon
- MongoDB Atlas
- Redis
- Pinecone
- Qdrant
- Weaviate
- Milvus
- Chroma
- LanceDB
- FAISS
- hybrid BM25 + vector retrieval
- reranking / temporal RAG / graph RAG

## AI platform/runtime layers
- OpenAI Responses API / Agents SDK patterns
- Vercel AI SDK / AI Gateway
- Google Vertex AI / Gemini agent patterns
- Azure AI / Microsoft agent patterns
- AWS Bedrock agent patterns
- Hugging Face agents/inference
- local inference via llama.cpp / GGUF as an optional lane

## Deployment/runtime
- Vercel
- Railway
- Render
- Replit
- Cloudflare Workers
- containers/Kubernetes as optional server-side lanes
- serverless functions and durable functions

## Evaluation / observability / governance patterns
- structured eval suites
- traces and spans
- deterministic schema validation
- critic/verifier agents
- rollback plans
- human approval gates
- policy-as-code
- secrets isolation
- rate/cost budgets

## Selection rule
Choose frameworks from requirements, not popularity. Primary dimensions: state durability, tool count, latency, concurrency, failure recovery, approval model, deployment target, mobile accessibility, provider lock-in and observability.
