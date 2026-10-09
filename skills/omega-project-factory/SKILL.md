---
name: omega-project-factory
description: Use OMEGA THOR's live GitHub Actions OIDC model-backed architect/implementer/QA to produce tested web PWAs, HTML5 mobile games, small API services, or Android-native Java prototypes from safe deterministic templates, with artifact evidence and review branches.
---

# OMEGA Project Factory — executable route

The canonical plugin is OMEGA 25.3.0, not a new copy. It contains executable Node.js tooling and tests. The GitHub runtime remains in owner repository `mojealterego/Agent-God-Level-Omega`, with existing `[THOR-BUILD]` model-code generation and `[THOR-LOVABLE]` planning paths untouched.

## Route the task

For a small verifiable project deliverable, create an **owner-authored** GitHub issue (connected GitHub app) titled:

`[THOR-PROJECT] web example-web`  or  `[THOR-PROJECT] game example-game` or `[THOR-PROJECT] api example-api` or `[THOR-PROJECT] android native-game`.

Body contains feature brief (<=2700 characters) and acceptance criteria. The original repository's GitHub Action runs three authenticated real model calls using GitHub Actions OIDC and Lovable AI Gateway. Three stages: architect writes bounded spec; implementer supplies **only strictly validated title/description/accent metadata**; QA audits observed tests. The trusted deterministic source templates produce actual project code; untrusted model output cannot write arbitrary files or execute commands. See `scripts/omega-project-agent.mjs` and `scripts/omega-project-factory.mjs`.

When a workflow finishes, require: successful Actions run, evidence receipt, runnable tests, published branch, and issue comment. Open a draft PR via the connected owner-authorized GitHub connector if bot policy blocks PR creation. Never auto-merge. Preserve repository default branch. A generated project is not automatically a production deployment.

## Build gates

- Web: local-first PWA, accessible markup, CSP-constrained HTTP static server, testable task model, offline cache and PNG homescreen icons.
- Game: HTML5 Canvas touch game, pure movement/collision physics tested and offline-capable PWA.
- API: dependency-free Node.js JSON task service, request bounds and HTTP CRUD tests; **in-memory only, not enterprise data durability**.
- Android: **native Java source** and Gradle/manifest; *APK unverified until a real Android SDK/Gradle build and device checks succeed*. Do not claim installable APK from static manifest checks.

Use `node --test tests/omega-project-*.test.mjs` in repository; if the runtime workflow uses Node 22, count exit codes. `hooks/omega-project-gate.mjs` recomputes SHA-256 of every generated artifact and fails closed on drift. The gate does not prove business-level requirements or mobile device quality.

## Runtime limits

Remote provider currently allows one request per role/run and 40 calls per day, with model-side response cap. There are 32 *typed specialist responsibilities* across four domains, **not** 32 independently running LLM processes. A real run uses three sequential remote model calls. Do not promise AAA games, unlimited agents, or native Android build/deploy when no such evidence exists.
