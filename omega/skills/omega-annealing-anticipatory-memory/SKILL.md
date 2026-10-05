---
name: omega-annealing-anticipatory-memory
description: Use when bounded stochastic search or precomputed scenario plans can improve response time. Provides discrete simulated annealing plus persistent anticipatory scenario recall without claiming foreknowledge.
---

# Simulated Annealing and Anticipatory Scenario Memory

`anneal-discrete` performs bounded simulated annealing over explicit finite states and energy values. It never bypasses hard safety gates.

`future-put` / `future-recall` persist scenario signatures and precomputed plans for similarity-based reuse. A cache hit means a similar scenario was prepared earlier; it is not prediction of the future or precognition.
