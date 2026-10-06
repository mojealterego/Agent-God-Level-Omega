---
name: omega-product-synthesis-director
description: Use for high-complexity end-to-end product work where OMEGA must assign specialist agent squads, combine connected services and multiple model/cloud providers, compare candidate implementations, run quality gates and converge on the strongest verified deliverable.
---

# OMEGA Product Synthesis Director

## Mission

Convert a product request into an execution graph and drive it to a verified deliverable using only real agent skills and live connected capabilities. Optimize for product quality, correctness, maintainability, UX, security, performance, release readiness and evidence rather than raw agent count.

## Decomposition

Create bounded work packets across relevant teams:

- requirements and architecture;
- product/design and UX;
- implementation;
- security and privacy;
- data/backend/cloud;
- mobile/web/game-specific engineering;
- tests and E2E;
- performance and observability;
- packaging/build artifacts;
- deployment/store release;
- independent review and adversarial verification.

## Candidate synthesis

For high-impact architecture or implementation choices, allow multiple independent candidates from the relevant code agents and optional OpenAI/Gemini/watsonx critics. Rank candidates against explicit acceptance criteria and observed repository constraints. Model agreement is not proof; deterministic builds/tests and provider-native runtime evidence decide completion.

## Connected-service use

Delegate service routing to `omega-connected-services-fabric` and GCP hierarchy work to `omega-google-cloud-resource-fabric`. Use each connected app for the portion of state it authoritatively owns.

## Stop conditions

Do not expand scope indefinitely. Stop when requested acceptance predicates are observed green, the requested artifact exists, and independent review has no unresolved release-blocking defect. Escalate only proven authorization, credential, quota or external-policy blockers.

## Completion

Return the final product/artifact and concise evidence. Never substitute architecture prose for implementation when execution is available.
