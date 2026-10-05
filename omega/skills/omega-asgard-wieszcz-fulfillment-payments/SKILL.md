---
name: omega-asgard-wieszcz-fulfillment-payments
description: Use for customer order intake, electronic delivery, implementation scheduling and payment-provider handoff. The module creates payment intents and fulfillment plans but never claims a payment settled unless a real provider confirms it.
---

# Wieszcz fulfillment and payments

Orders are stateful commercial records. They may schedule implementation, point to digital deliverables and declare a requested payment method such as PayPal, bank transfer, BLIK-capable payment processors or supported crypto processors.

## Rules

1. Do not store card numbers, private keys, seed phrases or payment credentials.
2. `wieszcz-payment-intent` is a plan until a real payment connector confirms settlement.
3. Electronic delivery occurs only after the required payment/approval state and artifact verification.
4. Implementation appointments are recorded explicitly and should be synchronized to a real calendar only through an authorized calendar connector.
5. Refund, tax, invoice and consumer-law obligations are provider/jurisdiction dependent and must use current evidence.
6. Fulfillment records distinguish digital delivery, service delivery and implementation work.

