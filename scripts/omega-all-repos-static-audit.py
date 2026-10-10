#!/usr/bin/env python3
"""Read-only indexed inventory of all GitHub repositories from the supplied 20-page account catalog.
No repository code is executed. Runtime health or MCP availability is never inferred from filenames.
"""
from __future__ import annotations
import concurrent.futures, collections, json, os, pathlib, re, time, urllib.request, urllib.error, hashlib

INPUT=pathlib.Path('references/github-mojealterego-589-repositories-2026-10-10.json')
OUTPUT=pathlib.Path('out/omega-repo-corpus')
TOKEN=os.environ.get('GITHUB_TOKEN','')
MAX_TREE_BYTES=8_000_000
MAX_DEEP_SIZE_KB=150_000
WORKERS=7
SKILL_RE=re.compile(r'(^|/)SKILL\.md$',re.I)
AGENT_RE=re.compile(r'(^|/)AGENT\.md$|(^|/)agents/[^/]+\.(md|yaml|yml|json)$',re.I)
MCP_RE=re.compile(r'(^|/)mcp(?:-|/|_|$)|mcp[-_]?server|modelcontextprotocol|(^|/)mcp\.json$',re.I)
LANGS={'node':'package.json','python':'pyproject.toml','go':'go.mod','rust':'Cargo.toml','java':'pom.xml','gradle':'build.gradle','kotlin':'build.gradle.kts','flutter':'pubspec.yaml','unity':'ProjectSettings/ProjectVersion.txt','unreal':'.uproject'}
def request(url,attempts=2):
    req=urllib.request.Request(url,headers={'Accept':'application/vnd.github+json','User-Agent':'omega-corpus-indexer/1.0','X-GitHub-Api-Version':'2022-11-28',**({'Authorization':'Bearer '+TOKEN} if TOKEN else {})})
    last=None
    for trial in range(attempts):
        try:
            with urllib.request.urlopen(req,timeout=24) as stream:
                raw=stream.read(MAX_TREE_BYTES+1)
                if len(raw)>MAX_TREE_BYTES:raise RuntimeError('API_TREE_EXCEEDS_8MB')
                return json.loads(raw)
        except (urllib.error.HTTPError,urllib.error.URLError,TimeoutError,RuntimeError) as e:
            last=str(e)
            if trial+1<attempts:time.sleep(1.1)
    raise RuntimeError(str(last)[:160])

def inspect(index_item):
    repo=index_item['repository']
    result={'repository':repo,'branch':index_item['branch'],'archived':index_item.get('archived'),'visibility':index_item.get('visibility'),'size_kb':index_item.get('size_kb'),
            'status':'unknown','skills':0,'agents':0,'mcp_candidate_files':0,'mcp_runtime_candidates':0,'paths_scanned':0,'license_present':False,'toolchain_markers':[],'samples':{},'error':None}
    if (index_item.get('size_kb') or 0)>MAX_DEEP_SIZE_KB:
        result['status']='metadata-only-large-repo'
        return result
    branch=index_item['branch'] or 'HEAD'
    url='https://api.github.com/repos/'+repo+'/git/trees/'+urllib.parse.quote(branch,safe='')+'?recursive=1'
    try:
        data=request(url)
        if not isinstance(data,dict) or not isinstance(data.get('tree'),list):raise RuntimeError('INVALID_TREE_RESPONSE')
        rows=[p for p in data['tree'] if p.get('type')=='blob' and isinstance(p.get('path'),str)]
        result['status']='tree-truncated' if data.get('truncated') else 'tree-scanned'
        result['paths_scanned']=len(rows)
        skills=[p for p in rows if SKILL_RE.search(p['path'])]
        agents=[p for p in rows if AGENT_RE.search(p['path'])]
        mcp=[p for p in rows if MCP_RE.search(p['path'])]
        runtime=[p for p in mcp if re.search(r'(?:^|/)(server|index|main|app|mcp_server)\.(ts|js|mjs|py|go|rs)$|mcp\.json$|package\.json$',p['path'],re.I)]
        result['skills']=len(skills);result['agents']=len(agents);result['mcp_candidate_files']=len(mcp);result['mcp_runtime_candidates']=len(runtime)
        paths={p['path'] for p in rows}
        result['license_present']=any(x.lower() in {'license','license.md','licence','copying'} for x in paths)
        result['toolchain_markers']=[label for label,file in LANGS.items() if file in paths or (label=='unreal' and any(x.endswith(file) for x in paths))]
        result['samples']={'skills':[x['path'] for x in skills[:12]],'agents':[x['path'] for x in agents[:12]],'mcp':[x['path'] for x in runtime[:12]]}
        result['sha256_of_path_sha_pairs']=hashlib.sha256(json.dumps([(x['path'],x.get('sha')) for x in rows],sort_keys=True).encode()).hexdigest()
    except Exception as e:
        result['status']='tree-scan-error';result['error']=str(e)[:190]
    return result

def main():
    inventory=json.loads(INPUT.read_text())
    repos=inventory['repositories'];assert len(repos)==589, f'unexpected size {len(repos)}'
    OUTPUT.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
        results=list(pool.map(inspect,repos))
    stats=collections.Counter(x['status'] for x in results)
    totals={k:sum(x.get(k,0) for x in results) for k in ('skills','agents','mcp_candidate_files','mcp_runtime_candidates','paths_scanned')}
    ranking=sorted((r for r in results if r['status'].startswith('tree-')),key=lambda r:(r['skills']*5+r['agents']*3+r['mcp_runtime_candidates']*5),reverse=True)
    obj={'schema':'omega.github-corpus-static-audit.v1','source_account':'mojealterego','source_catalog':str(INPUT),'source_repositories_listed':len(repos),'tree_scan_status':dict(stats),'source_counts_observed':totals,'warning':'Static filename inventory, not legal approval, service deployment, executable skill activations or model runner verification. Large/truncated/errors are explicitly identified.','repositories':results}
    (OUTPUT/'OMEGA-ALL-REPOSITORIES-STATIC-AUDIT.json').write_text(json.dumps(obj,indent=2,ensure_ascii=False)+'\n')
    md=['# OMEGA repository corpus — 20 linked pages','',
        'Read-only audit of **589** searchable repositories under github.com/mojealterego, using GitHub tree metadata. No third-party code executed.','',
        '## Coverage','','| Scan status | Repositories |','| --- | ---: |']
    md.extend(f'| {k} | {v} |' for k,v in sorted(stats.items()))
    md.extend(['','## Observed file counts',''])
    md.extend(f'- {k}: **{v}**' for k,v in totals.items())
    md.extend(['','MCP candidate file counts are NOT a count of active MCP servers; skills are repository copies, NOT distinct validated or installed skills. A public repository does not grant permission to relicense third-party forks.','',
               '## First 80 high-signal sources','', '| Repository | SKILL.md | Agent definitions | MCP runtime candidates | Result |','| --- | ---: | ---: | ---: | --- |'])
    md.extend(f"| [{r['repository']}](https://github.com/{r['repository']}) | {r['skills']} | {r['agents']} | {r['mcp_runtime_candidates']} | {r['status']} |" for r in ranking[:80])
    md.extend(['','## Integration rules','','- Preserve existing OMEGA files and exact identities. Deduplicate by canonical name and content hash.','- Read source licenses before copying skill content. Disallow unapproved telemetry, unknown binaries, executable hooks and client-side secrets.','- Only an authenticated MCP handshake + executable successful call proves a connected server.','- Only live inference execution evidence proves autonomous agent activity.','- Imported agent role descriptions are unbound until an actual executor is configured.',''])
    (OUTPUT/'OMEGA-ALL-REPOSITORIES-STATIC-AUDIT.md').write_text('\n'.join(md))
    print(json.dumps({'total':len(repos),'statuses':dict(stats),'observed':totals,'topSources':[{k:r[k] for k in ('repository','skills','agents','mcp_runtime_candidates')} for r in ranking[:12]]},indent=2))

if __name__=='__main__':main()
