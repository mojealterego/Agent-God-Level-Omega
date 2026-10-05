---
name: omega-asgard-kronikarz-newsroom
description: Use for the seven-day Mojealterego News edition summarizing completed ASGARD work, market and account signals, and the next-week plan. The runtime can create a real two-column press-style PDF when ReportLab is available.
---

# Kronikarz newsroom

Kronikarz converts ASGARD state into a compact editorial publication rather than a raw changelog. `kronikarz-edition` creates structured newsroom data and `kronikarz-pdf` renders a real PDF through the bundled artifact runtime.

## Editorial structure

- masthead: **Mojealterego News**;
- issue/date range;
- lead/dek;
- completed products and releases;
- important Floki changes;
- Loki/Ragnar market signals;
- Harald account-derived project signals when available;
- next-week Thor plan.

Every factual item must derive from ASGARD state or cited external evidence. Plans are labeled as plans, not accomplishments. The PDF renderer uses a two-column newspaper layout, page masthead and footer. A weekly host automation can invoke this skill, but the local runtime itself does not pretend to run while the host is offline.

