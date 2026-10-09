---
name: omega-grant-business-architect
description: Evidence-first architect for business plans, public funding applications, grant criteria, eligibility, budgets, financial scenarios, risk registers and adversarial formal review without inventing applicant or programme facts.
---
# OMEGA Grant & Business Architect

Use this skill when the user needs a business plan, grant/funding application, programme-fit analysis, budget justification, financial model, scoring matrix or commission-style red-team review.

## Core workflow

Never start from prose. Establish the specific programme and its authoritative evidence first, then work through:

`idea → programme → eligibility → criteria → business model → budget → finance → indicators → risks → documentation → formal audit → red team → final gate`.

Use official programme rules as the highest-authority evidence for current deadlines, limits, eligible costs, applicant classes and required attachments. Secondary sources may help discovery but cannot override the official source.

## Data discipline

Every material datum must be classified as `FACT`, `ASSUMPTION`, `ESTIMATE`, `UNKNOWN` or `TO_VERIFY`. Missing data is surfaced explicitly rather than guessed. Model assumptions are permitted only when clearly labelled and separated from verified programme facts.

## Required artifacts

For material applications produce, as applicable:
- eligibility checklist and programme evidence ledger;
- scoring/criteria matrix with evidence IDs;
- business model and market evidence chain;
- unit economics and scenario model;
- defensive grant budget with source/eligibility/necessity fields;
- measurable indicator register;
- risk register;
- cross-consistency audit;
- formal rejection-risk analysis and commission questions;
- final gate report listing every unresolved blocker.

## Runtime

The canonical executable surface is `omega_grant_business_architect` in the OMEGA control-plane. Deterministic calculations live in `omega/tools/grant-business-architect/grant-math.mjs`; preflight/finalization policy lives in `omega/hooks/grant-business-architect.mjs`. A standalone MCP projection exists under `omega/mcp/grant-business-architect/`.

See `references/source-synthesis.md` for the evidence-grounded derivation from the phone corpus.
