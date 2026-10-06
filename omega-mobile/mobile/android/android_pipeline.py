#!/usr/bin/env python3
"""Deterministic Android Gradle build/test/artifact helper for OMEGA.

The helper never executes through a shell. It constructs Gradle task names from
validated module/variant inputs, can run a bounded E2E plan, and emits SHA-256
metadata for APK/AAB outputs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import re
import signal
import subprocess
import sys
from typing import Iterable

SAFE_MODULE_RE = re.compile(r"^:?[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)*$")
SAFE_VARIANT_RE = re.compile(r"^[A-Za-z0-9]+$")
SAFE_TASK_RE = re.compile(r"^:?[A-Za-z0-9_.-]+(?::[A-Za-z0-9_.-]+)*$|^[A-Za-z0-9_.-]+$")
ACTIONS = {"assemble", "bundle", "lint", "test"}


def _upper_first(value: str) -> str:
    if not value:
        raise ValueError("variant must not be empty")
    return value[0].upper() + value[1:]


def _module_prefix(module: str) -> str:
    module = module.strip()
    if not SAFE_MODULE_RE.fullmatch(module):
        raise ValueError(f"invalid Gradle module path: {module!r}")
    return module if module.startswith(":") else f":{module}"


def _variant(value: str) -> str:
    value = value.strip()
    if not SAFE_VARIANT_RE.fullmatch(value):
        raise ValueError(f"invalid Android variant: {value!r}")
    return _upper_first(value)


def gradle_task(module: str, action: str, variant: str) -> str:
    action = action.strip()
    if action not in ACTIONS:
        raise ValueError(f"unsupported Gradle action: {action}")
    prefix = _module_prefix(module)
    cap = _variant(variant)
    if action == "test":
        return f"{prefix}:test{cap}UnitTest"
    return f"{prefix}:{action}{cap[0].upper() + cap[1:]}"


def build_plan(*, module: str, variant: str, test_variant: str, e2e_mode: str, managed_task: str | None) -> list[list[str]]:
    quality_and_build = [
        "./gradlew",
        gradle_task(module, "lint", variant),
        gradle_task(module, "test", variant),
        gradle_task(module, "assemble", variant),
        gradle_task(module, "bundle", variant),
        "--stacktrace",
        "--no-daemon",
    ]
    plan = [quality_and_build]
    if e2e_mode == "none":
        return plan
    if e2e_mode == "connected":
        prefix = _module_prefix(module)
        plan.append(["./gradlew", f"{prefix}:connected{_variant(test_variant)}AndroidTest", "--stacktrace", "--no-daemon"])
        return plan
    if e2e_mode == "managed":
        if not managed_task or not SAFE_TASK_RE.fullmatch(managed_task.strip()):
            raise ValueError("managed E2E mode requires one exact safe Gradle task name")
        plan.append(["./gradlew", managed_task.strip(), "--stacktrace", "--no-daemon", "-Pandroid.testoptions.manageddevices.emulator.gpu=swiftshader_indirect"])
        return plan
    raise ValueError(f"unsupported e2e mode: {e2e_mode}")


def _sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def artifact_manifest(root: pathlib.Path) -> list[dict[str, object]]:
    root = root.resolve()
    found: list[pathlib.Path] = []
    for suffix in (".aab", ".apk"):
        found.extend(path for path in root.glob(f"**/build/outputs/**/*{suffix}") if path.is_file() and path.stat().st_size > 0)
    found = sorted(set(found), key=lambda p: p.as_posix())
    return [
        {
            "path": str(path.resolve()),
            "relativePath": str(path.resolve().relative_to(root)),
            "suffix": path.suffix.lower(),
            "sizeBytes": path.stat().st_size,
            "sha256": _sha256(path),
        }
        for path in found
    ]


def _ensure_gradle_wrapper(root: pathlib.Path) -> pathlib.Path:
    wrapper = root / "gradlew"
    if not wrapper.is_file():
        raise RuntimeError(f"Gradle wrapper not found: {wrapper}")
    if not os.access(wrapper, os.X_OK):
        wrapper.chmod(wrapper.stat().st_mode | 0o100)
    return wrapper


def run_command(argv: list[str], *, cwd: pathlib.Path, timeout_seconds: int) -> None:
    process = subprocess.Popen(argv, cwd=cwd, start_new_session=True)
    try:
        code = process.wait(timeout=timeout_seconds)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=5)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        raise TimeoutError(f"command exceeded {timeout_seconds}s: {' '.join(argv)}") from None
    if code != 0:
        raise RuntimeError(f"command failed with exit code {code}: {' '.join(argv)}")


def execute_plan(plan: Iterable[list[str]], *, root: pathlib.Path, timeout_seconds: int) -> None:
    _ensure_gradle_wrapper(root)
    for argv in plan:
        run_command(argv, cwd=root, timeout_seconds=timeout_seconds)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OMEGA Android E2E build pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("plan", "run"):
        p = sub.add_parser(name)
        p.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
        p.add_argument("--module", default="app")
        p.add_argument("--variant", default="release")
        p.add_argument("--test-variant", default="debug")
        p.add_argument("--e2e-mode", choices=("none", "connected", "managed"), default="none")
        p.add_argument("--managed-task")
        p.add_argument("--timeout-seconds", type=int, default=3600)
    artifacts = sub.add_parser("artifacts")
    artifacts.add_argument("--root", type=pathlib.Path, default=pathlib.Path.cwd())
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "artifacts":
            manifest = artifact_manifest(args.root)
            print(json.dumps({"artifacts": manifest}, indent=2, sort_keys=True))
            return 0 if manifest else 2
        if args.timeout_seconds <= 0:
            raise ValueError("timeout-seconds must be positive")
        plan = build_plan(
            module=args.module,
            variant=args.variant,
            test_variant=args.test_variant,
            e2e_mode=args.e2e_mode,
            managed_task=args.managed_task,
        )
        if args.command == "plan":
            print(json.dumps({"commands": plan}, indent=2))
            return 0
        execute_plan(plan, root=args.root.resolve(), timeout_seconds=args.timeout_seconds)
        manifest = artifact_manifest(args.root)
        print(json.dumps({"commands": plan, "artifacts": manifest}, indent=2, sort_keys=True))
        return 0 if manifest else 2
    except (ValueError, RuntimeError, TimeoutError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
