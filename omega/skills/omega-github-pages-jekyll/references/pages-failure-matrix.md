# GitHub Pages failure matrix

Use this matrix to diagnose from evidence. Inspect the failing workflow step or Pages build log before modifying files.

| Symptom | Evidence to inspect | Typical repair direction |
| --- | --- | --- |
| YAML/front matter parse failure | exact file/line in build log | repair syntax or scalar quoting without rewriting unrelated metadata |
| Liquid error | template stack trace, offending include/layout | fix variable/filter/include usage or missing data |
| Missing route after successful build | generated output tree, permalink/front matter, collections config | repair route/front matter/collection output rules |
| Assets work locally but 404 on project Pages | rendered asset paths, `baseurl`, theme helpers | use baseurl-aware relative URL generation or correct site topology |
| Unsupported plugin in branch build | `_config.yml`, Gemfile, Pages dependency allowlist/build log | remove plugin or migrate to custom Actions build |
| Bundler/Ruby incompatibility | setup/install logs, Gemfile.lock platforms/Ruby constraints | align runner Ruby and dependency constraints; avoid arbitrary lockfile deletion |
| Artifact upload fails | output directory existence, artifact action log | correct build destination/path or artifact packaging |
| Deploy cannot find artifact | build/deploy job dependency and artifact name | make deploy depend on build and upload a valid Pages artifact |
| Deploy permission/OIDC failure | workflow `permissions`, environment, deploy log | add minimum Pages/OIDC permissions and correct environment |
| Workflow never runs on content push | `on:` filters, publishing branch, path filters | align triggers with actual publishing source |
| Commit from workflow does not start a second Pages build | actor/token/trigger chain | deploy in the same Pages workflow or use an explicit observable trigger architecture |
| Theme override ignored | build mode, theme dependency, file path/layout name | verify theme is installed and override path matches Jekyll conventions |
| Custom domain not serving | `CNAME`, Pages settings/deployment, DNS/certificate state | isolate repository config from external DNS/TLS and repair the failing layer only |
| Site exposes unintended file | generated `_site`/artifact contents, include/exclude rules | exclude sensitive/unneeded files and regenerate artifact before deploy |

After every repair, re-run the exact failing workflow and inspect the new result. Do not infer success from a commit alone.
