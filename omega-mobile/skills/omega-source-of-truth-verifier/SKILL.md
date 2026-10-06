---
name: omega-source-of-truth-verifier
description: Use when implementation depends on frameworks, libraries, APIs, cloud services, protocols, schemas, or product behavior that may have changed. Verifies versions and authoritative documentation before code is written or migrated.
---

# Source of Truth Verifier

## Version first

Before using an external API:
- read dependency manifests/lockfiles;
- identify actual installed/target version;
- identify runtime/platform version.

## Authority order

Prefer:
1. project-local generated/API schema;
2. official package/framework docs for the exact version;
3. official source repository/release notes;
4. standards specifications;
5. vendor support material;
6. secondary sources only as corroboration.

## Conflict protocol

When documentation conflicts with repository code:
- determine whether the repository intentionally uses an older/compatibility pattern;
- inspect migration history;
- avoid silently modernizing unrelated code;
- select the pattern compatible with the actual target.

## Citation/evidence

Store the authoritative source pointer in the evidence ledger for non-trivial external decisions.

## Hallucination barrier

Never invent:
- method names;
- endpoint fields;
- CLI flags;
- SDK options;
- version compatibility;
- deprecation status.

If unverified, classify as `UNKNOWN` and check.
