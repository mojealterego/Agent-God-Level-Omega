#!/usr/bin/env python3
"""Build a byte-for-byte deterministic ZIP and content manifest."""
from __future__ import annotations
import argparse, hashlib, json, os, stat, zipfile
from pathlib import Path

EPOCH=(1980,1,1,0,0,0)
EXCLUDED_PARTS={".git",".pytest_cache","__pycache__",".venv","node_modules"}

def iter_files(root: Path):
    for p in sorted(x for x in root.rglob("*") if x.is_file()):
        rel=p.relative_to(root)
        if any(part in EXCLUDED_PARTS for part in rel.parts) or p.suffix==".pyc":
            continue
        yield p, rel.as_posix()

def build(root: Path, output: Path, manifest_path: Path|None):
    entries=[]
    output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,"w",compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for p, rel in iter_files(root):
            data=p.read_bytes()
            mode=0o755 if os.access(p,os.X_OK) else 0o644
            info=zipfile.ZipInfo(rel,EPOCH)
            info.create_system=3
            info.external_attr=(mode & 0xFFFF)<<16
            info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
            entries.append({"path":rel,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"mode":oct(mode)})
    digest=hashlib.sha256(output.read_bytes()).hexdigest()
    manifest={"schema":"omega.reproducible-package.v1","root":root.name,"file_count":len(entries),"archive_sha256":digest,"entries":entries}
    if manifest_path:
        manifest_path.parent.mkdir(parents=True,exist_ok=True)
        manifest_path.write_text(json.dumps(manifest,indent=2,sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps({"archive":str(output),"sha256":digest,"file_count":len(entries)},sort_keys=True))
    return digest

def main():
    p=argparse.ArgumentParser()
    p.add_argument("root",type=Path)
    p.add_argument("--output",required=True,type=Path)
    p.add_argument("--manifest",type=Path)
    ns=p.parse_args()
    if not ns.root.is_dir(): raise SystemExit("root must be a directory")
    build(ns.root,ns.output,ns.manifest)
if __name__=="__main__":
    main()
