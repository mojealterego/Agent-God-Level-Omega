#!/usr/bin/env python3
"""Recover omitted OMEGA SKILL.md files from the exact user-owned Git blob SHAs.

Produces a source-verified, deduplicated overlay. Never executes source Markdown.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import zipfile

PACKAGE = "omega-omni-cognitive-engineering-v2"
BAD_SECRETS = re.compile(r"(?:-----BEGIN (?:RSA|OPENSSH|EC) PRIVATE KEY-----|sk-proj-[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,})")
NAME = re.compile(r"^[a-z0-9][a-z0-9-]{1,90}$")
MAX_FILE = 64_000

def git_blob_sha(content: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(content)).encode() + b"\0" + content).hexdigest()

def verify_item(item: dict, content: bytes) -> str:
    src, dest = item["src"], item["dest"]
    target = PurePosixPath(dest)
    source = PurePosixPath(src)
    if (target.is_absolute() or ".." in target.parts or len(target.parts) != 3
        or target.parts[0] != "skills" or target.parts[2] != "SKILL.md"
        or not NAME.fullmatch(target.parts[1])):
        raise ValueError(f"unsafe destination: {dest}")
    if (source.is_absolute() or ".." in source.parts
        or str(source) not in (f"omega/skills/{target.parts[1]}/SKILL.md",
                              f"omega-mobile/skills/{target.parts[1]}/SKILL.md")):
        raise ValueError(f"untrusted source path: {src}")
    if len(content) > MAX_FILE or len(content) < 50:
        raise ValueError(f"invalid source size: {src}")
    if git_blob_sha(content) != item["sha"]:
        raise ValueError(f"source changed from manifest: {src}")
    if BAD_SECRETS.search(content.decode("utf-8")):
        raise ValueError(f"detected secret in {src}")
    text = content.decode("utf-8-sig")
    if not text.startswith("---\n") or not re.search(r"^name:\s*[a-z0-9][a-z0-9-]+", text, re.M) or not re.search(r"^description:", text, re.M):
        raise ValueError(f"SKILL frontmatter missing: {src}")
    return text

def package(plan_path: Path, output_path: Path, *, checkout: Path) -> dict:
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if plan.get("schema") != "omega.skill-restore-plan.v1" or plan.get("source") != "mojealterego/Agent-God-Level-Omega":
        raise ValueError("unexpected plan identity")
    commit = plan["source_commit"]
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("unpinned source revision")
    entries = plan["items"]
    if not isinstance(entries, list) or not 1 <= len(entries) <= 200:
        raise ValueError("invalid restoration batch size")
    added, duplicates = [], set()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as zf:
        for entry in entries:
            src, dest = entry["src"], entry["dest"]
            if dest in duplicates:
                raise ValueError("duplicate target " + dest)
            duplicates.add(dest)
            file_path = checkout / src
            if not file_path.is_file() or file_path.is_symlink():
                raise ValueError("source not readable: " + src)
            data = file_path.read_bytes()
            text = verify_item(entry, data)
            # Git object identity is pinned individually, not just by branch.
            zf.writestr(PACKAGE + "/" + dest, text.encode("utf-8"))
            added.append({"src":src, "dest":dest, "git_blob_sha":entry["sha"], "sha256":hashlib.sha256(data).hexdigest()})
        report = {"schema":"omega.skill-restore-audit.v1","source":plan["source"],
                  "source_commit":commit,"imported":len(added),
                  "prior_skill_count":plan["existing_skills"],
                  "expected_skill_count":plan["existing_skills"]+len(added),
                  "import_scope":"instruction files only, no local executors or MCP connections",
                  "entries":added}
        zf.writestr(PACKAGE + "/references/omega-skill-restore-audit.json",
                    json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    return report

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--plan", default="references/omega-skill-restore-plan-2026-10-10.json")
    p.add_argument("--output", default="dist/omega-restored-skills.zip")
    args = p.parse_args()
    report = package(Path(args.plan), Path(args.output), checkout=Path(".").resolve())
    print(json.dumps({"status":"PASS","zip":args.output,"skills":report["imported"],
                      "expected":report["expected_skill_count"]}))

if __name__ == "__main__":
    main()
