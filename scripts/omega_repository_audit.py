#!/usr/bin/env python3
"""Read-only GitHub tree inventory for every repo in the pinned OMEGA source catalog."""
from __future__ import annotations
import argparse
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

ROOT = "mojealterego"
RISK = re.compile(r"rat|spy|offensive|hacking|malware|credential|phishing|steal|exploit|uncensored", re.I)
SKILL = re.compile(r"(^|/)SKILL[.]md$", re.I)
AGENT = re.compile(r"(^|/)(AGENT|AGENTS)[.]md$|(^|/)agents/.*[.](md|json|ya?ml)$", re.I)
MCP = re.compile(r"(^|/)(mcp|mcp-server|mcp_server|servers?)/|(^|/)mcp[.]json$|(^|/)server[.](mjs|js|py|ts)$", re.I)
HOOK = re.compile(r"(^|/)hooks?/|[.]hook[.]", re.I)
LIC = re.compile(r"^(LICENSE|LICENCE|COPYING)([.][^.]+)?$", re.I)

def validate_repo(item: dict) -> tuple[str, str]:
    name = item.get("repository")
    branch = item.get("branch")
    if not isinstance(name, str) or not re.fullmatch(r"mojealterego/[a-zA-Z0-9_.-]+", name):
        raise ValueError(f"unexpected repository identifier {name!r}")
    if not isinstance(branch, str) or not 1 <= len(branch) <= 120 or branch.startswith("-") or ".." in branch:
        raise ValueError(f"invalid default branch {name}")
    return name, branch

def classify(repo: str, tree: dict) -> dict:
    entries = tree.get("tree") or []
    if not isinstance(entries, list):
        raise ValueError("invalid Git tree response")
    files = [x for x in entries if x.get("type") == "blob" and isinstance(x.get("path"), str)]
    buckets = {"skills":[],"agents":[],"mcp":[],"hooks":[],"licenses":[]}
    for e in files:
        p = e["path"]
        if SKILL.search(p): buckets["skills"].append(e)
        if AGENT.search(p): buckets["agents"].append(e)
        if MCP.search(p): buckets["mcp"].append(e)
        if HOOK.search(p): buckets["hooks"].append(e)
        if LIC.fullmatch(p): buckets["licenses"].append(e)
    counts = {k:len(v) for k,v in buckets.items()}
    snippets = {k:[{"path":x["path"],"sha":x.get("sha"),"bytes":x.get("size")} for x in v[:90]] for k,v in buckets.items()}
    return {"repository":repo, "tree_sha":tree.get("sha"),"tree_truncated":bool(tree.get("truncated")),
            "total_tree_entries":len(entries),"source_files":len(files),
            "risk_review_required":bool(RISK.search(repo)),"counts":counts,"examples":snippets,
            "mcp_activated":False,"agents_executed":False,"skills_imported":False}

def api_tree(repo: str, branch: str, token: str, *, opener=urlopen) -> dict:
    uri = f"https://api.github.com/repos/{repo}/git/trees/{quote(branch,safe='')}?recursive=1"
    headers = {"Accept":"application/vnd.github+json",
               "X-GitHub-Api-Version":"2022-11-28", "User-Agent":"OMEGA-supply-chain-readonly-audit"}
    if token: headers["Authorization"] = "Bearer " + token
    req = Request(uri, headers=headers, method="GET")
    with opener(req, timeout=18) as response:
        # Bound memory if an upstream repository has a huge tree.
        raw = response.read(17_000_001)
    if len(raw) > 17_000_000: raise ValueError("TREE_TOO_LARGE")
    return json.loads(raw)

def audit(catalog: dict, shard: int, shards: int, token: str, *, lookup=api_tree) -> dict:
    repos = catalog["repositories"]
    if catalog.get("owner") != ROOT or not isinstance(repos,list):
        raise ValueError("untrusted catalog")
    if not 0 <= shard < shards <= 24: raise ValueError("bad shard")
    selected = list(enumerate(repos))[shard::shards]
    records = []
    for index, item in selected:
        try:
            repo, branch = validate_repo(item)
            data = lookup(repo, branch, token)
            classified = classify(repo,data)
            classified["status"]="AUDITED" if not classified["tree_truncated"] else "PARTIAL_TRUNCATED_TREE"
        except Exception as ex:
            name=item.get("repository","INVALID") if isinstance(item,dict) else "INVALID"
            classified={"repository":name,"status":"ERROR","error":type(ex).__name__+":"+str(ex)[:180]}
        classified["catalog_index"]=index
        records.append(classified)
        if len(records)%25==0: print(json.dumps({"shard":shard,"visited":len(records),"of":len(selected)}), flush=True)
    return {"schema":"omega.github-owner-source-audit.v1","shard":shard,"shards":shards,
            "catalog_repos":len(repos),"visited":len(records),
            "audited":sum(r["status"]=="AUDITED" for r in records),
            "errors":sum(r["status"]=="ERROR" for r in records),
            "truncated":sum(r["status"]=="PARTIAL_TRUNCATED_TREE" for r in records),
            "results":records,
            "disclaimer":"Source-tree inventory only: MCP tool connections and agent executors are NOT activated."}

def main() -> None:
    p=argparse.ArgumentParser()
    p.add_argument("--catalog",default="references/github-mojealterego-589-repositories-2026-10-10.json")
    p.add_argument("--shard",type=int,required=True);p.add_argument("--shards",type=int,default=6)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    catalog=json.loads(Path(a.catalog).read_text(encoding="utf-8"))
    result=audit(catalog,a.shard,a.shards,os.environ.get("GITHUB_TOKEN",""))
    target=Path(a.out);target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({k:v for k,v in result.items() if k!="results"}))
    # Partial scans are explicitly indicated in artifact; no fabricated overall completion.
if __name__=="__main__": main()
