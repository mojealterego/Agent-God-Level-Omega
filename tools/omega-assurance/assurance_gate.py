#!/usr/bin/env python3
from __future__ import annotations
import argparse, ast, hashlib, json, re, subprocess, sys
from pathlib import Path

RANK={"info":0,"low":1,"medium":2,"high":3,"critical":4}
SHA40=re.compile(r"^[0-9a-f]{40}$")
USES=re.compile(r"(?m)^\s*-\s*uses:\s*([^\s#]+)")
PIPE=re.compile(r"(?i)(curl|wget)[^\n|]*\|\s*(sh|bash)")

def finding(code,severity,path,message,evidence):
    raw="\0".join(map(str,(code,severity,path,message,evidence)))
    return {"code":code,"severity":severity,"path":str(path),"message":message,"evidence":str(evidence),
            "evidence_id":hashlib.sha256(raw.encode()).hexdigest()[:24]}

def finish(cmd,fs,data,fail_at="high"):
    out={"schema":"omega.assurance.v1","command":cmd,"findings":fs,
         "counts":{s:sum(x["severity"]==s for x in fs) for s in RANK},"data":data}
    print(json.dumps(out,indent=2,sort_keys=True))
    return 1 if any(RANK[x["severity"]]>=RANK[fail_at] for x in fs) else 0

def workflow(root):
    fs=[]; paths=sorted([*root.glob("*.yml"),*root.glob("*.yaml")])
    for p in paths:
        t=p.read_text(encoding="utf-8"); q=p.as_posix()
        if re.search(r"(?m)^\s{0,4}pull_request_target\s*:",t):
            fs.append(finding("WF001","critical",q,"pull_request_target forbidden","trigger"))
        if re.search(r"(?m)^\s*permissions\s*:\s*write-all\s*$",t):
            fs.append(finding("WF002","critical",q,"write-all forbidden","permissions"))
        if PIPE.search(t): fs.append(finding("WF003","high",q,"remote pipe-to-shell installer","pipe"))
        for m in USES.finditer(t):
            spec=m.group(1).strip("'\"")
            if spec.startswith(("./","docker://")): continue
            if "@" not in spec:
                fs.append(finding("WF004","high",q,"unversioned Action",spec)); continue
            ref=spec.rsplit("@",1)[1]
            if not SHA40.fullmatch(ref): fs.append(finding("WF005","high",q,"mutable Action ref",spec))
        if re.search(r"(?m)^\s+(issue_comment|pull_request_review_comment)\s*:",t) and re.search(r"(?m)^\s+contents\s*:\s*write\s*$",t):
            fs.append(finding("WF006","high",q,"comment-triggered workflow has contents:write","event->write"))
    return fs,{"workflow_count":len(paths)}

def pyarch(root):
    fs=[]; files=sorted(p for p in root.rglob("*.py") if "__pycache__" not in p.parts)
    mods={p.relative_to(root).with_suffix("").as_posix().replace("/","."):p for p in files}
    graph={m:set() for m in mods}; edges=[]
    for mod,p in mods.items():
        try: tree=ast.parse(p.read_text(encoding="utf-8"),filename=str(p))
        except Exception as e:
            fs.append(finding("PY001","high",p,"Python parse failure",e)); continue
        for n in ast.walk(tree):
            names=[]
            if isinstance(n,ast.Import): names=[a.name for a in n.names]
            elif isinstance(n,ast.ImportFrom) and n.module: names=[n.module]
            for name in names:
                dst=next((m for m in mods if m==name or m.startswith(name+".") or name.startswith(m+".")),None)
                if dst and dst!=mod: graph[mod].add(dst); edges.append((mod,dst,getattr(n,"lineno",0)))
    idx=0; stack=[]; on=set(); ix={}; low={}; cycles=[]
    def visit(v):
        nonlocal idx
        ix[v]=low[v]=idx; idx+=1; stack.append(v); on.add(v)
        for w in sorted(graph[v]):
            if w not in ix: visit(w); low[v]=min(low[v],low[w])
            elif w in on: low[v]=min(low[v],ix[w])
        if low[v]==ix[v]:
            c=[]
            while True:
                w=stack.pop(); on.remove(w); c.append(w)
                if w==v: break
            if len(c)>1: cycles.append(sorted(c))
    for v in sorted(graph):
        if v not in ix: visit(v)
    for c in cycles: fs.append(finding("PY002","medium",root,"internal import cycle"," -> ".join(c)))
    return fs,{"python_files":len(files),"internal_edges":len(edges),"cycles":cycles,
               "graph_sha256":hashlib.sha256(json.dumps(edges,sort_keys=True).encode()).hexdigest()}

def knowledge(root):
    fs=[]; entries=[]; allowed={".md",".txt",".json",".yml",".yaml",".rst",".adoc"}
    for p in sorted(x for x in root.rglob("*") if x.is_file() and x.suffix.lower() in allowed):
        b=p.read_bytes(); rel=p.relative_to(root).as_posix()
        entries.append({"path":rel,"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()})
        if len(b)>2_000_000: fs.append(finding("KN001","medium",rel,"knowledge file exceeds 2MB",len(b)))
    h=hashlib.sha256(json.dumps(entries,sort_keys=True,separators=(",",":")).encode()).hexdigest()
    return fs,{"file_count":len(entries),"manifest_sha256":h}

def model(path):
    fs=[]; d=json.loads(path.read_text()); ids=set()
    for p in d.get("providers",[]):
        pid=p.get("id")
        if not pid or pid in ids: fs.append(finding("MD001","high",path,"missing/duplicate provider id",pid))
        ids.add(pid)
        if p.get("classification")=="red_team_only":
            for ok,code,msg in [(p.get("default") is False,"MD002","red-team provider must not be default"),
                                (p.get("local_allowed") is False,"MD003","red-team provider must be remote-only"),
                                (p.get("bundle_weights") is False,"MD004","red-team weights must not be bundled"),
                                (p.get("require_explicit_authorization") is True,"MD005","explicit authorization required")]:
                if not ok: fs.append(finding(code,"high",path,msg,pid))
        for key in ("base_url_env","api_key_env"):
            v=p.get(key)
            if v and not re.fullmatch(r"[A-Z][A-Z0-9_]{2,127}",v): fs.append(finding("MD006","high",path,"invalid env reference",v))
    return fs,{"provider_count":len([x for x in ids if x]),"providers":sorted(x for x in ids if x)}

def issue(path):
    t=path.read_text(encoding="utf-8").lower(); fs=[]
    req={"reproduction":r"(steps to reproduce|reproduction)","expected":r"expected (behavior|result)",
         "actual":r"actual (behavior|result)","environment":r"(environment|version)"}
    present={k:bool(re.search(v,t)) for k,v in req.items()}
    for k,ok in present.items():
        if not ok: fs.append(finding("IS001","medium",path,f"missing issue section: {k}",k))
    return fs,{"sections":present,"body_sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
               "ai_log_authenticity_claimed":False}

def diff(repo,base,head):
    cp=subprocess.run(["git","-C",str(repo),"diff","--name-status",f"{base}...{head}"],capture_output=True,text=True)
    if cp.returncode: return [finding("DF001","high",repo,"git diff failed",cp.stderr[:500])],{}
    prefixes=(".github/workflows/",".omega/","omega/mcp/","omega-mobile/mcp/","omega/skills/","omega-mobile/skills/")
    changes=[]; fs=[]
    for line in cp.stdout.splitlines():
        parts=line.split("\t")
        if len(parts)<2: continue
        status,path=parts[0],parts[-1]; risk="high" if path.startswith(prefixes) else "low"
        changes.append({"status":status,"path":path,"risk":risk})
        if risk=="high": fs.append(finding("DF002","medium",path,"AI/control-surface change requires review",status))
    return fs,{"changes":changes}

def main():
    ap=argparse.ArgumentParser(); sp=ap.add_subparsers(dest="cmd",required=True)
    for name,arg in [("workflow-audit","root"),("python-arch","root"),("knowledge-manifest","root"),
                     ("model-profile-check","file"),("issue-validate","file")]:
        p=sp.add_parser(name); p.add_argument(arg,type=Path); p.add_argument("--fail-at",default="high",choices=RANK)
    p=sp.add_parser("artifact-diff"); p.add_argument("--repo",type=Path,default=Path(".")); p.add_argument("--base",required=True); p.add_argument("--head",required=True); p.add_argument("--fail-at",default="high",choices=RANK)
    n=ap.parse_args()
    if n.cmd=="workflow-audit": fs,data=workflow(n.root)
    elif n.cmd=="python-arch": fs,data=pyarch(n.root)
    elif n.cmd=="knowledge-manifest": fs,data=knowledge(n.root)
    elif n.cmd=="model-profile-check": fs,data=model(n.file)
    elif n.cmd=="issue-validate": fs,data=issue(n.file)
    else: fs,data=diff(n.repo,n.base,n.head)
    raise SystemExit(finish(n.cmd,fs,data,n.fail_at))
if __name__=="__main__": main()
