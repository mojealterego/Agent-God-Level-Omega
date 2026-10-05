---
name: omega-negotiation-finops-batna
description: Use for negotiation, finops and batna workflows in OMEGA v9 when the task needs this operational capability and evidence-backed execution rather than prose-only advice.
---

# Negotiation, FinOps and BATNA

Use this skill when architecture decisions involve vendors, cloud/API pricing, infrastructure budgets, lock-in, SLA targets, or technical-debt tradeoffs.

## Operational workflow

1. Gather observed cost inputs: fixed monthly fees, variable usage, migration cost, security/compliance work, engineering hours, training/fine-tuning cost and target horizon.
2. Express hard requirements as gates: minimum quality, maximum p95 latency, data-location/security constraints and maximum TCO.
3. Call `omega_meta_architect` with `negotiation-compare` to calculate comparable TCO and BATNA leverage.
4. Keep an actual alternative provider or architecture behind the same facade/router. A BATNA is not credible if migration requires a rewrite.
5. Use the result to negotiate concrete terms: unit price, committed-use discount, egress, support tier, exit/migration assistance and SLA.

Do not invent vendor discounts or negotiation outcomes. The runtime quantifies positions; actual commercial negotiation still requires a real communication channel and authorized human/business action.
