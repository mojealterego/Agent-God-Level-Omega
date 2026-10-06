#!/usr/bin/env python3
"""Google Play Developer Publishing API release helper for OMEGA.

Credentials are obtained through Application Default Credentials. The script
never accepts raw credentials on the command line and never prints tokens.
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys
from typing import Any

ANDROID_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher"
VALID_STATUSES = {"draft", "inProgress", "halted", "completed"}
PACKAGE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$")


def validate_package_name(package_name: str) -> None:
    if not PACKAGE_RE.fullmatch(package_name.strip()):
        raise ValueError(f"invalid Android package name: {package_name!r}")


def artifact_kind(path: pathlib.Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".aab":
        return "bundle"
    if suffix == ".apk":
        return "apk"
    raise ValueError("Google Play artifact must be .aab or .apk")


def load_release_notes(path: pathlib.Path | None) -> dict[str, str]:
    if path is None:
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not payload:
        raise ValueError("release notes must be a non-empty JSON object of BCP-47 language -> text")
    result: dict[str, str] = {}
    for language, text in payload.items():
        if not isinstance(language, str) or not language.strip() or not isinstance(text, str) or not text.strip():
            raise ValueError("release notes keys and values must be non-empty strings")
        result[language.strip()] = text.strip()
    return result


def enforce_track_guard(track: str, status: str, *, allow_production: bool) -> None:
    if track.strip().lower() == "production" and status in {"completed", "inProgress"} and not allow_production:
        raise PermissionError("production rollout requires --allow-production")


def release_body(
    version_code: int,
    status: str,
    release_name: str | None,
    notes: dict[str, str],
    user_fraction: float | None,
    update_priority: int,
) -> dict[str, Any]:
    if version_code <= 0:
        raise ValueError("version_code must be positive")
    if status not in VALID_STATUSES:
        raise ValueError(f"unsupported release status: {status}")
    if not 0 <= update_priority <= 5:
        raise ValueError("in-app update priority must be between 0 and 5")
    if status == "inProgress":
        if user_fraction is None or not 0.0 < user_fraction < 1.0:
            raise ValueError("inProgress release requires 0 < user_fraction < 1")
    elif user_fraction is not None:
        raise ValueError("user_fraction is only valid for inProgress releases")

    release: dict[str, Any] = {
        "versionCodes": [str(version_code)],
        "status": status,
        "inAppUpdatePriority": update_priority,
    }
    if release_name:
        release["name"] = release_name
    if notes:
        release["releaseNotes"] = [
            {"language": language, "text": notes[language]}
            for language in sorted(notes)
        ]
    if user_fraction is not None:
        release["userFraction"] = user_fraction
    return {"releases": [release]}


def build_service():
    try:
        import google.auth
        from googleapiclient.discovery import build
    except ImportError as exc:
        raise RuntimeError(
            "Google Play dependencies are missing; install cloud/google-play/requirements.txt"
        ) from exc
    credentials, _ = google.auth.default(scopes=[ANDROID_PUBLISHER_SCOPE])
    return build("androidpublisher", "v3", credentials=credentials, cache_discovery=False)


def upload_artifact(service, package_name: str, edit_id: str, artifact: pathlib.Path) -> int:
    try:
        from googleapiclient.http import MediaFileUpload
    except ImportError as exc:
        raise RuntimeError(
            "google-api-python-client is required; install cloud/google-play/requirements.txt"
        ) from exc
    media = MediaFileUpload(str(artifact), resumable=True)
    kind = artifact_kind(artifact)
    if kind == "bundle":
        response = service.edits().bundles().upload(
            packageName=package_name, editId=edit_id, media_body=media
        ).execute()
    else:
        response = service.edits().apks().upload(
            packageName=package_name, editId=edit_id, media_body=media
        ).execute()
    version_code = response.get("versionCode")
    if not isinstance(version_code, int):
        raise RuntimeError("Google Play upload response did not include integer versionCode")
    return version_code


def publish(
    service,
    *,
    package_name: str,
    artifact: pathlib.Path,
    track: str,
    status: str,
    release_name: str | None,
    notes: dict[str, str],
    user_fraction: float | None,
    update_priority: int,
    commit: bool,
    allow_production: bool,
) -> dict[str, Any]:
    validate_package_name(package_name)
    enforce_track_guard(track, status, allow_production=allow_production)
    if not artifact.is_file() or artifact.stat().st_size <= 0:
        raise ValueError(f"artifact does not exist or is empty: {artifact}")
    artifact_kind(artifact)

    edit = service.edits().insert(packageName=package_name, body={}).execute()
    edit_id = edit.get("id")
    if not isinstance(edit_id, str) or not edit_id:
        raise RuntimeError("Google Play did not return an edit id")
    committed = False
    try:
        version_code = upload_artifact(service, package_name, edit_id, artifact)
        track_body = release_body(
            version_code,
            status,
            release_name,
            notes,
            user_fraction,
            update_priority,
        )
        track_result = service.edits().tracks().update(
            packageName=package_name,
            editId=edit_id,
            track=track,
            body=track_body,
        ).execute()
        validation = service.edits().validate(
            packageName=package_name,
            editId=edit_id,
        ).execute()
        if commit:
            commit_result = service.edits().commit(
                packageName=package_name,
                editId=edit_id,
            ).execute()
            committed = True
        else:
            commit_result = None
        return {
            "packageName": package_name,
            "artifact": str(artifact.resolve()),
            "artifactType": artifact_kind(artifact),
            "track": track,
            "status": status,
            "versionCode": version_code,
            "validated": True,
            "committed": committed,
            "trackResult": track_result,
            "validation": validation,
            "commitResult": commit_result,
        }
    finally:
        if not committed:
            try:
                service.edits().delete(packageName=package_name, editId=edit_id).execute()
            except Exception:
                pass


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="OMEGA Google Play release automation")
    parser.add_argument("--package", required=True, dest="package_name")
    parser.add_argument("--artifact", required=True, type=pathlib.Path)
    parser.add_argument("--track", default="internal")
    parser.add_argument("--status", choices=sorted(VALID_STATUSES), default="completed")
    parser.add_argument("--release-name")
    parser.add_argument("--release-notes-file", type=pathlib.Path)
    parser.add_argument("--user-fraction", type=float)
    parser.add_argument("--update-priority", type=int, default=0)
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--allow-production", action="store_true")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        notes = load_release_notes(args.release_notes_file)
        service = build_service()
        result = publish(
            service,
            package_name=args.package_name,
            artifact=args.artifact,
            track=args.track,
            status=args.status,
            release_name=args.release_name,
            notes=notes,
            user_fraction=args.user_fraction,
            update_priority=args.update_priority,
            commit=args.commit,
            allow_production=args.allow_production,
        )
        print(json.dumps(result, indent=2, sort_keys=True, default=str))
        return 0
    except (ValueError, RuntimeError, PermissionError, OSError, json.JSONDecodeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
