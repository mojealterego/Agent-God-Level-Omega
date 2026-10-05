---
name: omega-retrospective-bitemporal-correction
description: Use after failed decisions to record decision signatures and prevent recurrence using bitemporal retrospective policy correction. Does not claim retrocausality or backward-in-time gradient propagation.
---

# Retrospective Bitemporal Correction

Use `retro-record` when a decision path is proven harmful and `retro-evaluate` before repeating a similar path. The ledger records transaction/record time and applies future penalties or blocks to matching decision signatures.

This is a practical point-in-time learning mechanism. It changes future decisions based on past evidence; it does not send information backward in physical time.
