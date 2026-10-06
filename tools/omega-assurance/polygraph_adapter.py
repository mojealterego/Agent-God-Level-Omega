#!/usr/bin/env python3
"""Plan a Polygraph MCP behavioral litmus without silently installing/executing it."""
from __future__ import annotations
import argparse, json, os, re, shutil, sys
from urllib.parse import urlparse

def valid_target(value: str) -> bool:
    if value.startswith(("http://", "https://")):
        p=urlparse(value)
        return bool(p.hostname) and p.scheme in {"http","https"}
    return bool(re.fullmatch(r"[A-Za-z0-9._/@:+-]{1,512}", value))

def main() -> int:
    p=argparse.ArgumentParser()
    p.add_argument("target", help="Explicit MCP URL or local target")
    p.add_argument("--minimum-grade", default="C", choices=list("ABCDEF"))
    p.add_argument("--execute", action="store_true", help="Execute only an already-installed polygraphso-litmus binary")
    ns=p.parse_args()
    if not valid_target(ns.target):
        raise SystemExit("invalid target")
    binary=shutil.which("polygraphso-litmus")
    plan={
      "target":ns.target,
      "minimum_grade":ns.minimum_grade,
      "binary":binary,
      "available":bool(binary),
      "command":[binary or "polygraphso-litmus","litmus","--target",ns.target,"--minimum-grade",ns.minimum_grade],
      "auto_install":False,
      "executed":False
    }
    if not ns.execute:
        print(json.dumps(plan,indent=2)); return 0
    if not binary:
        print(json.dumps({**plan,"error":"POLYGRAPH_NOT_INSTALLED"},indent=2)); return 2
    import subprocess
    cp=subprocess.run(plan["command"],text=True)
    return cp.returncode
if __name__=="__main__":
    raise SystemExit(main())
