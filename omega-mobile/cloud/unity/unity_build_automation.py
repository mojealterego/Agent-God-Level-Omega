#!/usr/bin/env python3
"""OMEGA client for Unity Build Automation v2.

Uses only the Python standard library. Credentials are read from environment
variables and are never emitted in normal output.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from typing import Any, Iterable, NamedTuple
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

DEFAULT_BASE_URL = "https://build-automation.services.api.unity.com/v2"
DEFAULT_TIMEOUT_SECONDS = 60
SUCCESS_STATUSES = {"success", "successful", "succeeded"}
FAILURE_STATUSES = {"failure", "failed", "canceled", "cancelled", "error"}
TERMINAL_STATUSES = SUCCESS_STATUSES | FAILURE_STATUSES


class Config(NamedTuple):
    key_id: str
    secret: str
    org_id: str
    project_id: str
    build_target_id: str
    base_url: str = DEFAULT_BASE_URL


def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"required environment variable {name} is not set")
    return value


def load_config() -> Config:
    return Config(
        key_id=_required_env("UNITY_SERVICE_ACCOUNT_KEY_ID"),
        secret=_required_env("UNITY_SERVICE_ACCOUNT_SECRET"),
        org_id=_required_env("UNITY_ORG_ID"),
        project_id=_required_env("UNITY_PROJECT_ID"),
        build_target_id=_required_env("UNITY_BUILD_TARGET_ID"),
        base_url=os.environ.get("UNITY_BUILD_AUTOMATION_BASE_URL", DEFAULT_BASE_URL).rstrip("/"),
    )


def _segment(value: str | int) -> str:
    return quote(str(value), safe="")


def build_url(org_id: str, project_id: str, build_target_id: str, number: int | None = None, *, base_url: str = DEFAULT_BASE_URL) -> str:
    url = (
        f"{base_url.rstrip('/')}/orgs/{_segment(org_id)}/projects/{_segment(project_id)}"
        f"/buildtargets/{_segment(build_target_id)}/builds"
    )
    if number is not None:
        url += f"/{_segment(number)}"
    return url


def trigger_payload(*, clean: bool, commit: str | None, branch: str | None, label: str | None) -> dict[str, Any]:
    payload: dict[str, Any] = {"clean": bool(clean), "delay": 0, "headless": True}
    if commit:
        payload["commit"] = commit
    if branch:
        payload["branch"] = branch
    if label:
        payload["label"] = label
    return payload


def extract_build_number(payload: Any) -> int:
    candidate = payload[0] if isinstance(payload, list) and payload else payload
    if not isinstance(candidate, dict) or not isinstance(candidate.get("build"), int):
        raise ValueError("Unity Build Automation response did not contain an integer build number")
    return int(candidate["build"])


def is_terminal_status(status: Any) -> bool:
    return str(status or "").strip().lower() in TERMINAL_STATUSES


def is_success_status(status: Any) -> bool:
    return str(status or "").strip().lower() in SUCCESS_STATUSES


def redact(value: Any, *, secrets: Iterable[str]) -> Any:
    secret_values = [s for s in secrets if s]

    def clean_scalar(item: Any) -> Any:
        if not isinstance(item, str):
            return item
        lowered = item.lower()
        if lowered.startswith("basic ") or lowered.startswith("bearer "):
            return "[REDACTED]"
        result = item
        for secret in secret_values:
            result = result.replace(secret, "[REDACTED]")
        return result

    if isinstance(value, dict):
        result = {}
        for key, item in value.items():
            if str(key).lower() in {"authorization", "secret", "password", "token", "key"}:
                result[key] = "[REDACTED]"
            else:
                result[key] = redact(item, secrets=secret_values)
        return result
    if isinstance(value, list):
        return [redact(item, secrets=secret_values) for item in value]
    if isinstance(value, tuple):
        return tuple(redact(item, secrets=secret_values) for item in value)
    return clean_scalar(value)


def _auth_header(config: Config) -> str:
    token = base64.b64encode(f"{config.key_id}:{config.secret}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def request_json(config: Config, method: str, url: str, payload: dict[str, Any] | None = None, *, timeout: int = DEFAULT_TIMEOUT_SECONDS) -> Any:
    body = None if payload is None else json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {
        "Accept": "application/json",
        "Authorization": _auth_header(config),
        "User-Agent": "OMEGA-Unity-Cloud/3.3",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = Request(url=url, data=body, headers=headers, method=method.upper())
    try:
        with urlopen(request, timeout=timeout) as response:
            data = response.read()
            if not data:
                return {"httpStatus": response.status}
            return json.loads(data.decode("utf-8"))
    except HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            detail: Any = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            detail = {"body": raw[:2000]}
        safe = redact(detail, secrets=[config.secret, config.key_id])
        raise RuntimeError(f"Unity Build Automation HTTP {exc.code}: {json.dumps(safe, ensure_ascii=False)}") from None
    except URLError as exc:
        raise RuntimeError(f"Unity Build Automation network error: {exc.reason}") from None


def trigger_build(config: Config, *, clean: bool, commit: str | None, branch: str | None, label: str | None) -> Any:
    return request_json(
        config,
        "POST",
        build_url(config.org_id, config.project_id, config.build_target_id, base_url=config.base_url),
        trigger_payload(clean=clean, commit=commit, branch=branch, label=label),
    )


def get_status(config: Config, number: int) -> Any:
    return request_json(
        config,
        "GET",
        build_url(config.org_id, config.project_id, config.build_target_id, number, base_url=config.base_url),
    )


def cancel_build(config: Config, number: int) -> Any:
    return request_json(
        config,
        "DELETE",
        build_url(config.org_id, config.project_id, config.build_target_id, number, base_url=config.base_url),
    )


def wait_for_build(config: Config, number: int, *, timeout_seconds: int, poll_seconds: int) -> Any:
    if timeout_seconds <= 0:
        raise ValueError("timeout_seconds must be positive")
    if poll_seconds <= 0:
        raise ValueError("poll_seconds must be positive")
    deadline = time.monotonic() + timeout_seconds
    while True:
        status = get_status(config, number)
        build_status = status.get("buildStatus") if isinstance(status, dict) else None
        if is_terminal_status(build_status):
            return status
        if time.monotonic() >= deadline:
            raise TimeoutError(f"Unity build {number} did not reach a terminal state within {timeout_seconds}s")
        time.sleep(min(poll_seconds, max(0.1, deadline - time.monotonic())))


def _print_safe(config: Config, payload: Any) -> None:
    print(json.dumps(redact(payload, secrets=[config.secret, config.key_id]), ensure_ascii=False, sort_keys=True))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OMEGA Unity Build Automation v2 client")
    sub = parser.add_subparsers(dest="command", required=True)

    trigger = sub.add_parser("trigger", help="trigger a cloud build")
    trigger.add_argument("--clean", action=argparse.BooleanOptionalAction, default=True)
    trigger.add_argument("--commit")
    trigger.add_argument("--branch")
    trigger.add_argument("--label")
    trigger.add_argument("--wait", action="store_true")
    trigger.add_argument("--timeout-seconds", type=int, default=7200)
    trigger.add_argument("--poll-seconds", type=int, default=20)

    status = sub.add_parser("status", help="get one build status")
    status.add_argument("number", type=int)

    cancel = sub.add_parser("cancel", help="cancel one build")
    cancel.add_argument("number", type=int)

    wait = sub.add_parser("wait", help="wait for one build to finish")
    wait.add_argument("number", type=int)
    wait.add_argument("--timeout-seconds", type=int, default=7200)
    wait.add_argument("--poll-seconds", type=int, default=20)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        config = load_config()
        if args.command == "trigger":
            created = trigger_build(config, clean=args.clean, commit=args.commit, branch=args.branch, label=args.label)
            if not args.wait:
                _print_safe(config, created)
                return 0
            number = extract_build_number(created)
            final = wait_for_build(config, number, timeout_seconds=args.timeout_seconds, poll_seconds=args.poll_seconds)
            _print_safe(config, final)
            return 0 if is_success_status(final.get("buildStatus") if isinstance(final, dict) else None) else 2
        if args.command == "status":
            result = get_status(config, args.number)
            _print_safe(config, result)
            return 0
        if args.command == "cancel":
            result = cancel_build(config, args.number)
            _print_safe(config, result)
            return 0
        if args.command == "wait":
            result = wait_for_build(config, args.number, timeout_seconds=args.timeout_seconds, poll_seconds=args.poll_seconds)
            _print_safe(config, result)
            return 0 if is_success_status(result.get("buildStatus") if isinstance(result, dict) else None) else 2
        raise RuntimeError(f"unsupported command: {args.command}")
    except (RuntimeError, ValueError, TimeoutError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
