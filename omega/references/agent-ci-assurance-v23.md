# Agent CI Assurance — v23

OMEGA v23 consolidates recurring patterns found across contemporary agent-oriented GitHub Actions into internal gates rather than automatically trusting each Action. The assurance plane covers immutable dependency references, least-privilege workflow permissions, bounded agent loops, explicit budgets, observability contracts, fail-closed provider errors, protected paths, verification before landing and structured release evidence.

Third-party Actions remain optional adapters. Direct use requires an explicit repository decision, an immutable commit SHA where technically possible, reviewed permissions and a documented rollback path. Marketplace popularity or a green badge is not treated as proof of security.
