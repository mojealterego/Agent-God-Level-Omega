# GitHub Pages + Jekyll runbook

## 1. Classify the existing site

Inspect repository evidence and classify the site as one of:

- Jekyll source built by GitHub Actions;
- Jekyll source built by branch publishing;
- another static-site generator deployed by Actions;
- prebuilt static files;
- no Pages implementation yet.

Record the default branch, site source directory, generated output directory, custom domain state and relevant workflow names before editing.

## 2. Preserve or migrate intentionally

Do not migrate a functioning branch-based site to Actions merely for style. Migrate when the task requires custom plugins, custom Ruby dependencies, reproducibility, non-Jekyll generation, richer verification or direct Actions control.

When migrating, keep the current public URL stable unless the user explicitly requests a URL/domain change. Preserve `CNAME`, canonical metadata, redirects and path structure.

## 3. Jekyll dependency policy

For an Actions-based Jekyll build:

- keep Ruby/Bundler inputs explicit when the workflow installs gems itself;
- prefer a committed dependency definition suitable for reproducible CI;
- inspect `Gemfile.lock` compatibility instead of deleting it reflexively;
- do not add a plugin only to `_config.yml`; the build environment must actually install it;
- do not rely on the restricted GitHub Pages plugin allowlist when the site is built in a custom Actions job.

For branch-based Pages builds, keep dependencies within GitHub Pages-supported behavior and detect unsupported plugins before committing configuration that cannot build on the hosted Pages builder.

## 4. `_config.yml` policy

Preserve existing keys not involved in the task. Validate at least:

- `title`, `description`, theme settings and plugin list;
- `url` and `baseurl` against the real Pages topology;
- Markdown/highlighter configuration;
- include/exclude rules;
- collections/defaults/permalinks when present.

Do not write repository URL strings into `baseurl`; `baseurl` is a path prefix, not a full URL.

## 5. Content policy

For pages, keep front matter valid YAML and route semantics consistent with the site. For posts, use a valid date-prefixed filename in `_posts/`, valid front matter and a stable title/permalink policy. Do not duplicate routes.

When the repository uses a custom theme, inspect its existing layouts/includes before creating overrides. Prefer a targeted override to a copied theme tree.

## 6. Actions workflow policy

For a Pages workflow, separate the build responsibility from the deploy responsibility even if both jobs live in one YAML file. The build must produce exactly one directory of static output and upload it as the Pages artifact. The deploy job must depend on that build and use the repository's configured Pages deployment environment.

When creating or repairing a workflow, resolve current official action versions from GitHub's Pages starter workflow or verified action release state during execution. Preserve already-working versions unless a compatibility problem, security advisory or requested upgrade justifies a change.

## 7. Android-first operation

Do not require a local Ruby toolchain as the normal path. Use GitHub Actions to build, test and deploy when the connected GitHub app exposes the necessary repository and workflow operations. Local `bundle exec jekyll serve` remains an optional developer preview path, not a prerequisite for autonomous operation.

## 8. Completion criteria

A Pages/Jekyll task is complete only when every requested layer that is observable has evidence:

- repository source/config committed or PR created;
- build succeeds;
- Pages deploy succeeds;
- expected URL/deployment record is present;
- requested route/content exists in the generated or live site when accessible.
