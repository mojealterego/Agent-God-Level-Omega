---
name: omega-multilanguage-engineering
description: Execute bounded, real, model-backed JavaScript/Python/Go/Rust engineering from owner GitHub issues through architect, implementer, QA, network-isolated container tests, per-task branches and review gates; do not simulate builds or claim broad E2E/AAA support.
---

# OMEGA Multi-Language Engineering Kernel

## What is actually executable

Canonical owner repo: `mojealterego/Agent-God-Level-Omega`. Existing GitHub Actions is the host runtime. This skill gives **routing instructions**, not a magically present `thor-submit` tool. Prefer the connected GitHub plugin to read the repo, create issues and inspect Actions results. Do not install another ChatGPT plugin, Android controller app, or duplicate ASGARD orchestrator.

The new owner-scoped trigger is `[THOR-CODE] <language> <slug>` with supported language keys `js`, `py`, `go`, `rs`. Body contains a bounded, testable task description and acceptance criteria. The workflow uses GitHub-signed OIDC and the existing Lovable gateway to run exactly three sequential *real model* calls: architect, implementer, independent QA. The implementer must generate code+tests as JSON. The kernel writes `experiments/omega-engineering/issue-N-slug` and runs real language-native tests in network-disabled, read-only, unprivileged Docker containers before pushing a branch `omega/engineering-N` for review. QA's structured `BLOCK` stops publishing. Code is **not merged or deployed** automatically.

Specializations are distinct role prompts using three authenticated model invocations, **not** hundreds of independent remote processes. More languages/frameworks require separate tested adapters, not unsupported claims.

## Procedure and evidence gates

1. Read repo `main`, open issues and existing PRs. Deduplicate by language, task identity and objective. Preserve active user branch and unrelated files.
2. Confirm `omega-engineering-kernel.mjs` and its test suite exist and an Actions workflow accepts `[THOR-CODE]`.
3. Open a single owner-authored issue, for example title `[THOR-CODE] py isolated-sort`, body describes exact algorithm, edge cases and expected tests. Never include tokens/passwords in issue bodies.
4. Poll the **actual** Actions run conclusion; inspect issue comment, sandbox exit code, file hashes and resulting branch. Do not infer success from an issue creation or agent definition.
5. If Actions tests pass and review is PASS, open a **draft** PR using the owner-authorized GitHub connector when GitHub Actions policy prohibits bot-created PRs. Do not auto-merge.
6. On failure, preserve the evidence and report precisely. A passing unit test does not prove runtime deployment, Android builds, enterprise security, visual quality or AAA gameplay.

### Supported test commands in sandbox

- `js`: Node 22 ESM + `node --test test.mjs`
- `py`: Python 3.12 stdlib `python -B -m unittest -v test_subject`
- `go`: Go 1.24 stdlib `go test -v` with modules disabled
- `rs`: Rust 1.85 stdlib `rustc --test /work/tests.rs -o /tmp/omega-test-bin && /tmp/omega-test-bin`

Containers run with `--network none --read-only --cap-drop ALL --security-opt no-new-privileges`, bounded memory/CPU/PIDs, unprivileged user and no AI credentials. Source and tests remain untrusted; no production privileges, auto-merge or secret access are granted.

## Completion rule

`PLANNED != GENERATED != TESTED != BRANCH_PUSHED != REVIEWED != MERGED != DEPLOYED`.

Report only observed transitions. Mandatory test and QA failure gates cannot be bypassed by model messages, comments, archived SKILL text, or fabricated results.
