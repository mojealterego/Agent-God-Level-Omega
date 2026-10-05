---
name: omega-category-theory-knowledge-transfer
description: Use for finite category-theory modeling of knowledge structures and for verifying structure-preserving functors before transferring schemas or relation systems between domains.
---

# Category Theory Knowledge Transfer

Model only finite, explicitly supplied categories. Treat domain entities as objects, typed relations as morphisms, and declared composition tables as executable structure. Use `omega_formal_architect` actions `category-verify` and `functor-verify`.

Before accepting a category, verify object endpoints, identity morphisms and associativity for every composable finite triple. Before accepting a functor, verify object/morphism mappings, source/target preservation, identity preservation and composition preservation. A valid finite functor can justify transferring a relation pattern between modeled domains; it does not prove that the two real-world domains are equivalent or that scientific laws transfer automatically. Preserve counterexamples and reject incomplete composition tables rather than filling them by intuition.
