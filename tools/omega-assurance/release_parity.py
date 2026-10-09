#!/usr/bin/env python3
"""Verify that an OMEGA main checkout preserves the owned v25.1.1 source package.

Content deviations are reported without silently replacing newer implementations.
Missing files and invalid baseline paths are errors. --strict also fails on changes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

DIGEST_LINE = re.compile(r"^([a-f0-9]{64})  (.+)$")


def source_path(root: Path, name: str) -> Path:
    if not name or "\\" in name or name.startswith("/"):
        raise ValueError(f"Invalid source path: {name!r}")
    parts = name.split("/")
    if any(p in {"", ".", ".."} for p in parts):
        raise ValueError(f"Unsafe source path: {name!r}")
    resolved_root = root.resolve()
    candidate = (resolved_root / name).resolve()
    if not candidate.is_relative_to(resolved_root):
        raise ValueError(f"Source escapes root: {name!r}")
    return candidate


def load_baseline(path: Path) -> dict[str, str]:
    expected = {}
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw:
            continue
        match = DIGEST_LINE.fullmatch(raw)
        if match is None:
            raise ValueError(f"Invalid digest line {line_number}")
        digest, name = match.groups()
        source_path(Path("/source"), name)
        if name in expected:
            raise ValueError(f"Duplicate path on line {line_number}: {name}")
        expected[name] = digest
    if not expected:
        raise ValueError("Empty source baseline")
    return expected


def audit(root: Path, baseline: Path, extras: Path) -> dict:
    expected = load_baseline(baseline)
    metadata = json.loads(extras.read_text(encoding="utf-8"))
    required = metadata["required_extra_paths"]
    if not isinstance(required, list) or not all(isinstance(p, str) for p in required):
        raise ValueError("Invalid extra paths")
    if len(set(required)) != len(required):
        raise ValueError("Duplicate extra paths")
    if set(required) & expected.keys():
        raise ValueError("Extra paths duplicate digest baseline")
    results = {"release": metadata["release"],
               "baseline_entries": len(expected), "extra_sources": len(required),
               "matching_hashes": 0, "changed_hashes": [], "missing_sources": [],
               "ignored_generated_cache": metadata.get("ignored_generated_cache", [])}
    for name, original_hash in sorted(expected.items()):
        path = source_path(root, name)
        if not path.is_file():
            results["missing_sources"].append(name)
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest == original_hash:
            results["matching_hashes"] += 1
        else:
            results["changed_hashes"].append(name)
    for name in required:
        if not source_path(root, name).is_file():
            results["missing_sources"].append(name)
    results["preserved_sources"] = (
        len(expected) + len(required) - len(results["missing_sources"])
    )
    results["total_required_sources"] = len(expected) + len(required)
    results["passed_preservation"] = not results["missing_sources"]
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--extras", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--strict", action="store_true",
                        help="Also block content drift; disabled for the evolving main branch")
    args = parser.parse_args()
    try:
        result = audit(args.root, args.baseline, args.extras)
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(f"RECOVERY BASELINE ERROR: {error}", file=sys.stderr)
        return 2
    rendered = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    if args.report is not None:
        args.report.write_text(rendered, encoding="utf-8")
    print(rendered)
    if not result["passed_preservation"]:
        return 1
    if args.strict and result["changed_hashes"]:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
