---
name: omega-activation-feature-factorization
description: Use when real activation matrices are available and interpretable factorization is useful. Runs bounded non-negative matrix factorization and reports reconstruction/sparsity without claiming universal monosemantic features.
---

# Activation Feature Factorization

Use `activation-factorize` with a real numeric activation matrix. OMEGA performs bounded NMF and returns component weights, sample loadings, sparsity estimates and reconstruction error.

This can support interpretability experiments, but it does not prove that a component is monosemantic or explain arbitrary neural-network weights. Stronger mechanistic interpretability requires real activation capture and, when appropriate, dedicated SAE/interpretability tooling.
