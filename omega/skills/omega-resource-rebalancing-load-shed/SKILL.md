---
name: omega-resource-rebalancing-load-shed
description: Use for explicit CPU/RAM quota allocation, donation of idle resource budgets, overload admission control and graceful protection of critical work.
---

# Resource Rebalancing and Load Shedding

Model resource capacity explicitly before allocating quotas to agents/tasks. Donation can transfer unused quota from an idle actor to another actor only if the donor owns that quota and the total allocation remains within configured capacity.

When utilization exceeds the overload threshold:
- preserve critical control-plane/recovery traffic;
- shed low-priority optional work;
- pause self-improvement, prefetch and background experiments before user-critical paths;
- record which work was deferred or dropped.

Actions: `resource-init`, `resource-allocate`, `resource-donate`, `load-admit`.

This controller reallocates logical budgets. It does not directly move GPU VRAM or operating-system memory between processes unless a real scheduler/orchestrator exposes that capability.
