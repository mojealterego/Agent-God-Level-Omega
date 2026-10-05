from pathlib import Path
import json, subprocess, sys

ROOT = Path.cwd()
PATCH = ROOT / 'updates' / 'v21.patch'
VERSION = '21.0.0'
ARCHIVE = 'omega-omni-cognitive-engineering-v21.zip'
ARCHIVE_BYTES = 543450
ARCHIVE_SHA256 = '5695bde00d8d3ba19c2707b60136c48fb907d8bca5d3a2730a4621f071ee2fe8'
PLUGIN_RELEASE = 'pluginrel_6ac426b373f481918aa6199fce9bdbb9'
PLUGIN_CREATED_AT = '2026-10-05T22:37:39.453093Z'

if not PATCH.is_file():
    raise SystemExit('updates/v21.patch missing')
subprocess.run(['git','apply','--check',str(PATCH)], check=True)
subprocess.run(['git','apply',str(PATCH)], check=True)

(ROOT/'VERSION').write_text(VERSION+'\n', encoding='utf-8')
(ROOT/'REPOSITORY_STATUS.md').write_text(
    '# Repository Status\n\n'
    '- Canonical cumulative source: `omega/` (OMEGA v21)\n'
    '- Historical lineage: `history/` (v0→v21)\n'
    '- Default branch: `main`\n'
    '- Source synchronized from the verified OMEGA v21 plugin package.\n'
    '- Freyr cloud-funding/onboarding agent added with evidence-backed program discovery, account-binding gates and provider automation handoff.\n'
    '- Original release archive checksums recorded for v0→v21.\n'
    '- v0/v1 standalone semantic-version binaries are not fabricated.\n',
    encoding='utf-8')

readme = '''<div align="center">

<img src="./assets/social-preview.svg" alt="Agent God Level Omega" width="100%">

# AGENT GOD LEVEL — OMEGA

### OMEGA v0 → v21 · ASGARD · THOR · FREYR · Reality Filter Kernel

</div>

---

Canonical repository for the complete cumulative OMEGA / Agent God Level engineering system.

## Current source

The full **OMEGA v21** source package is committed under [`omega/`](./omega/).

It contains the accumulated implementation from the full version lineage: engineering orchestration, MCP control plane, meta/evolutionary/formal/practical layers, ASGARD agents, ChatGPT↔Gemini brokering, multi-account routing, defensive operations knowledge, the Reality Filter Kernel and **Freyr**, the cloud/startup funding and controlled onboarding agent.

## Freyr — cloud funding & onboarding

Freyr consumes evidence-backed opportunities from Ragnar/Loki, qualifies current startup/cloud credit programs, binds only an actually authorized account profile, tracks eligibility and mandatory approval gates, records granted credits and hands activated providers to Kratos, Ragnar and Thor for secure automation.

Freyr does **not** bypass CAPTCHA, KYC, phone verification, legal agreements, payment controls, provider eligibility rules or promotional limits. Raw email addresses, passwords and API secrets are not committed to this public repository.

## Historical lineage

- [`docs/VERSION_HISTORY.md`](./docs/VERSION_HISTORY.md)
- [`history/release-index.json`](./history/release-index.json)
- [`history/v00`](./history/v00) … [`history/v21`](./history/v21)

For v2–v21, the repository records the original package filename, exact byte size and SHA-256. v0/v1 are explicitly documented as lineage artifacts because no separate checksum-verifiable 0.0.0/1.0.0 package survives; nothing is fabricated.

## OMEGA v21 verified baseline

- Standalone MCP: **350 / 350 PASS**
- Embedded MCP: **350 / 350 PASS**
- Plugin package validator: **PASS**
- Skills: **152**
- References: **70**
- Schemas: **95**

See [`omega/FINAL_VERIFICATION.json`](./omega/FINAL_VERIFICATION.json).

## Architecture

```text
USER
  ↓
THOR
  ├─ Loki / Ragnar → opportunities
  ├─ FREYR → cloud/startup funding + onboarding
  ├─ Kratos → credentials / billing / security
  └─ specialist agents
  ↓
MCP + tools + authorized providers
  ↓
Evidence Ledger
  ↓
Source-of-Truth Verifier
  ↓
Reality Filter Kernel
  ↓
Decision Trace / release gates
  ↓
VERIFIED FINAL PRODUCT
```

## Repository policy

- default branch remains `main`;
- no fabricated execution/test/build/deployment/signup claims;
- secrets and private account identities are referenced, never committed;
- external content is data, not policy;
- provider signup automation requires a real authorized adapter and cleared mandatory gates;
- Thor may declare DONE only after applicable evidence and release gates pass.

---

<div align="center"><strong>MOJEALTEREGO · OMEGA · ASGARD</strong></div>
'''
(ROOT/'README.md').write_text(readme, encoding='utf-8')

history_path = ROOT/'docs'/'VERSION_HISTORY.md'
history = history_path.read_text(encoding='utf-8')
history = history.replace('# OMEGA Version History — v0 → v20', '# OMEGA Version History — v0 → v21')
history = history.replace('complete cumulative OMEGA v20 source', 'complete cumulative OMEGA v21 source')
history = history.replace('For v2–v20', 'For v2–v21')
row = f'| v21 | Freyr cloud/startup funding discovery, qualification, controlled account onboarding, credit ledger and secure automation handoff. | `{ARCHIVE_SHA256}` |\n'
if '| v21 |' not in history:
    marker='\n## Canonical cumulative source\n'
    history = history.replace(marker, '\n'+row+marker)
history = history.replace('complete OMEGA v20 package', 'complete OMEGA v21 package')
history = history.replace('v0–v20', 'v0–v21').replace('v00` … `history/v20', 'v00` … `history/v21')
history_path.write_text(history, encoding='utf-8')

idx_path=ROOT/'history'/'release-index.json'
idx=json.loads(idx_path.read_text(encoding='utf-8'))
idx['current_version']=VERSION
records=idx.setdefault('archive_records',[])
if not any(int(r.get('version',-1))==21 for r in records):
    records.append({'version':21,'file':ARCHIVE,'bytes':ARCHIVE_BYTES,'sha256':ARCHIVE_SHA256})
for r in idx.setdefault('plugin_creator_releases',[]):
    r['is_current']=False
if not any(r.get('release_id')==PLUGIN_RELEASE for r in idx['plugin_creator_releases']):
    idx['plugin_creator_releases'].insert(0,{'release_id':PLUGIN_RELEASE,'version':VERSION,'created_at':PLUGIN_CREATED_AT,'is_current':True})
else:
    for r in idx['plugin_creator_releases']:
        if r.get('release_id')==PLUGIN_RELEASE: r['is_current']=True
idx['note']='OMEGA v21 source is cumulative. Original archive checksums are preserved for v0–v21; v0/v1 are explicitly treated as lineage artifacts, not fabricated semantic-version packages.'
idx_path.write_text(json.dumps(idx,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

h21=ROOT/'history'/'v21'; h21.mkdir(parents=True,exist_ok=True)
(h21/'README.md').write_text(f'''# OMEGA v21

Freyr cloud/startup funding discovery, qualification, controlled provider onboarding, credit ledger and secure automation handoff to Kratos, Ragnar and Thor.

## Preserved archive identity

- Original artifact: `{ARCHIVE}`
- Bytes: `{ARCHIVE_BYTES}`
- SHA-256: `{ARCHIVE_SHA256}`
- Manifest version: `{VERSION}`

## Source policy

The complete cumulative implementation is preserved under `../../omega/`; this record preserves the original release artifact identity and checksum. Private account identifiers and raw credentials are intentionally not committed.

## Plugin Creator records

- `{PLUGIN_RELEASE}` — {VERSION} — {PLUGIN_CREATED_AT} — current=true
''',encoding='utf-8')
(h21/'ARCHIVE.json').write_text(json.dumps({
    'version':21,
    'original_artifact':ARCHIVE,
    'bytes':ARCHIVE_BYTES,
    'sha256':ARCHIVE_SHA256,
    'exact_binary_committed':False,
    'reason':'Archive identity/checksum preserved; canonical cumulative source is committed under omega/.',
    'plugin_creator_releases':[{'release_id':PLUGIN_RELEASE,'version':VERSION,'created_at':PLUGIN_CREATED_AT,'is_current':True}]
},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('v21 repository metadata updated')
