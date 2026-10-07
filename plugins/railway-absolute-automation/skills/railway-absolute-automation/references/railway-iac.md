# Railway Infrastructure as Code

Current Railway documentation describes project-level Infrastructure as Code through one authoring file under `.railway/`.

Preferred authoring surface:
- `.railway/railway.ts` — generally available
- `.railway/railway.py` — beta
- `.railway/railway.go` — beta

Legacy `railway.json` / `railway.toml` Config as Code is deprecated. Do not introduce legacy Config as Code into a new service.

For reviewed GitOps automation, Railway's `railwayapp/config` GitHub Action supports plan-on-PR and apply-after-merge. Its model pins the change set, environment configuration identity and `.railway/` tree so apply can reject drift.

Use IaC when it materially improves repeatability or reviewability. The ChatGPT Railway app remains the preferred execution surface for this plugin because it is cross-platform and does not require a local CLI.
