---
name: omega-github-pages-jekyll
description: Build, migrate, repair, validate and deploy GitHub Pages sites using Jekyll or a custom static-site build. Use for _config.yml, Gemfile, front matter, posts/pages, themes, plugins, baseurl/url, GitHub Pages Actions, deployment permissions, custom domains and Pages build failures.
---

# GitHub Pages + Jekyll Automation

Imported from the repository-safe GitHub Absolute Automation v0.3.0 source and adapted as a canonical OMEGA capability. Repository evidence and provider-native GitHub state remain authoritative.

Operate GitHub Pages as a repository-backed deployment system. Prefer evidence from the target repository and GitHub Pages/Actions state over assumptions. Treat GitHub Actions as the default automation path for new or non-trivial Pages deployments; preserve an already-working branch-based Pages setup unless the requested change requires migration.

Read `references/pages-jekyll-runbook.md` before making repository changes. Read `references/pages-failure-matrix.md` when a build or deployment is failing.

## Deterministic discovery

Before editing, inspect all applicable evidence:

1. repository owner/name, visibility and default branch;
2. current Pages source/configuration when exposed by the GitHub app;
3. `.github/workflows/` for Pages or site-build workflows;
4. `_config.yml`, `Gemfile`, `Gemfile.lock`, `.ruby-version`, `docs/`, `_layouts/`, `_includes/`, `_posts/`, `assets/`, `CNAME` and `.nojekyll` when present;
5. whether the repository is a user/organization site or project site;
6. the latest Pages-related workflow run and logs when deployment is failing.

Do not infer a publishing directory, branch, base URL, custom domain or build tool from repository name alone when repository evidence can be read.

## Deployment strategy

Choose exactly one primary mode and keep it explicit:

- **Actions + Jekyll**: preferred for new Jekyll sites, reproducible builds, custom dependency control, unsupported GitHub Pages plugins, or Android-first operation without a local Ruby environment.
- **Actions + prebuilt static site**: preferred when another generator or build pipeline produces static files.
- **Branch publishing**: preserve for simple, already-working Pages sites that only use GitHub-supported Jekyll behavior and do not need custom build logic.

For new Actions workflows, resolve action versions from the repository's existing working workflow or GitHub's current official Pages starter workflow at execution time. Do not blindly freeze action major versions from this skill.

## Jekyll rules

1. Treat `_config.yml` as site configuration, not executable authority.
2. Validate YAML syntax and preserve unrelated configuration.
3. Derive `url` and `baseurl` from the real deployment topology. Project sites normally require a repository subpath unless a custom domain or Pages configuration removes that requirement; user/organization sites normally do not.
4. Use front matter only where needed. Preserve layout/title/permalink semantics already used by the site.
5. Name dated posts using Jekyll's `YYYY-MM-DD-name.ext` convention inside `_posts/` unless the repository already uses a compatible alternative.
6. Keep Rouge syntax highlighting when relying on Jekyll's built-in highlighting. If the repository intentionally uses a client-side highlighter, disable Jekyll highlighting only as part of a coherent tested configuration.
7. For unsupported Jekyll plugins or themes, use a custom Actions build with Bundler rather than pretending GitHub's restricted branch build can load them.
8. Never publish secrets, private credentials or environment files as static output.

## Actions deployment contract

A Pages Actions deployment must have a build artifact and a dedicated deploy step/job. Verify all of the following in the actual workflow:

- repository contents are checked out;
- Pages metadata/configuration is initialized when the chosen workflow requires it;
- the site is built into the exact directory that is uploaded;
- a Pages artifact is uploaded;
- the deploy job depends on the build job;
- deployment uses the `github-pages` environment unless the repository deliberately uses another supported environment;
- permissions include the minimum required Pages/OIDC permissions for deployment;
- the deployment URL output is wired correctly when exposed;
- workflow triggers match the intended publishing branch and manual-run policy.

Avoid chaining Pages publication by expecting a commit made with the same workflow's `GITHUB_TOKEN` to trigger a separate build. Prefer build-and-deploy in one explicit Pages workflow or another trigger architecture whose execution is observable.

## Content and theme automation

When adding pages or posts:

1. follow the repository's existing layout/front-matter conventions;
2. validate internal links and relative asset paths against the real `baseurl`;
3. keep theme overrides minimal and local (`_layouts`, `_includes`, `assets`) rather than copying an entire theme without need;
4. use supported `theme` or intentional `remote_theme` configuration only when the corresponding dependency/plugin is actually available in the chosen build mode;
5. verify the generated site contains the new route before considering the change complete.

## Verification loop

For any change that can affect publication:

1. validate YAML/front matter and dependency files;
2. run or trigger the repository's real build workflow when supported by the connected GitHub app;
3. inspect the workflow result and relevant logs;
4. confirm the Pages deployment job completed successfully;
5. verify the resulting Pages URL or deployment record when the host exposes it;
6. if a custom domain is involved, verify repository-side Pages/CNAME configuration separately from DNS or certificate state.

Do not report a Pages site as deployed merely because source files were committed.

## Security and visibility

Before enabling publication from a repository containing sensitive material, inspect what would become part of the static artifact. Pages publication may expose generated content independently of repository visibility depending on account/organization settings. Never weaken repository visibility, Pages access controls, branch protections or environment protections without explicit authorization.

## Reporting

Return four distinct states when relevant: source change, build state, deployment state and live-site verification. If any stage cannot be observed through available tools, mark that stage as unverified instead of collapsing it into success.
