# OMEGA Mobile Engineering v4.3

OMEGA v4.3 is an Android-first product engineering operating system for ChatGPT mobile with **171 coordinated agent skills** and two complementary MCP execution surfaces:

1. **Remote MCP Gateway** — one Cloud Run-ready Streamable HTTP backend shared by ChatGPT and Gemini-compatible custom MCP clients.
2. **Termux Secure MCP** — the existing OpenAI Secure MCP Tunnel to the phone-local stdio control plane for ADB, device logs, local builds and artifact inspection.

## Agent teams

| Team | Agent skills | Purpose |
|---|---:|---|
| AAA Android game studio | 68 | Unity/gameplay/rendering/assets/performance/multiplayer/live ops/QA/release |
| Native Android E2E | 30 | Kotlin/Compose/Gradle/data/network/security/device tests/APK/AAB/Play |
| Web/full-stack E2E | 30 | frontend/backend/data/auth/AppSec/browser E2E/observability/cloud release |
| Code lifecycle | 10 | requirements/architecture/implementation/refactor/debug/tests/dependencies/review/migration |
| Core control plane | 21 | orchestration/context/security/verification/self-healing/CI/cloud/artifact completion |
| Multi-cloud/runtime fabric | 12 | OpenAI, Gemini/Vertex, GCP, IBM/watsonx, remote MCP, OAuth, cross-client routing |
| **Total** | **171** | Hierarchical execution, not 171 simultaneous model processes |

## Shared remote backend

```text
ChatGPT Android ─┐
                 ├─ HTTPS /mcp → OMEGA Remote MCP on Cloud Run
Gemini mobile ───┘                    │
                                      ├─ OMEGA control plane
                                      ├─ GitHub / GitLab / cloud workflows
                                      ├─ Google Cloud / Vertex AI / Gemini
                                      ├─ IBM Cloud / watsonx
                                      ├─ Unity / Google Play
                                      └─ provider-native verification

ChatGPT Android ── OpenAI Secure MCP Tunnel ── Termux ── ADB/device/local execution
```

The remote service is an **OAuth resource server**. It supports OIDC/JWKS validation or RFC 7662 introspection and publishes RFC 9728 protected-resource metadata. It does not mint tokens itself and does not embed OAuth, Google, IBM, Play or signing credentials.

## Remote MCP assets

- `mcp/omega-control-plane/src/http-server.mjs`
- `mcp/omega-control-plane/src/auth/oidc-verifier.mjs`
- `mcp/omega-control-plane/Dockerfile`
- `mcp/omega-control-plane/test/http-server.test.mjs`
- `cloud/github/omega-remote-mcp-cloudrun.yml`
- `cloud/gitlab/omega-remote-mcp-cloudrun.yml`
- `cloud/google/remote-mcp/README.md`
- `clients/chatgpt-remote-mcp.md`
- `clients/gemini-custom-app.md`

## Existing automation retained

- GitHub / GitLab CI and repository automation
- Android E2E, APK/AAB, device matrices and Google Play Publisher API
- Unity Build Automation and AAA Android game squad
- organization/folder/project-aware Google Cloud resource fabric
- Gemini through Vertex AI
- IBM Cloud Code Engine / watsonx
- web/full-stack E2E
- OpenAI developer/platform lanes
- Termux Secure MCP runtime

No desktop is required for cloud-native work.

## v4.3.2 real-deployment bootstrap

The package now includes a one-time Cloud Shell bootstrap that creates/reuses the GCP control plane and GitHub WIF without static Google keys, plus a Cloud Run deploy script and authenticated MCP verifier. The only external prerequisite not auto-created by OMEGA is the OAuth/OIDC authorization server/client relationship used by ChatGPT and Gemini; OMEGA remains the protected resource server.
