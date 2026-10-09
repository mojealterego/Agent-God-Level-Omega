#!/usr/bin/env python3
"""Create, validate, catalog, and package portable Agent Skills.

Python 3.10+; requires PyYAML 6.x. No network or GitHub write access is used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlparse

try:
    import yaml
except ImportError as exc:
    raise SystemExit('Install dependency: python -m pip install "PyYAML>=6,<7"') from exc

NAME_PATTERN = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
PLACEHOLDER_PATTERN = re.compile(r'(?im)\b(?:TODO|FIXME|TBD)\s*[:\]]|\[(?:TODO|INSERT|PLACEHOLDER)[^\]]*\]')
MARKDOWN_LINK_PATTERN = re.compile(r'(?<!!)\[[^\]]*\]\(([^\s\)]+)(?:\s+"[^"]+")?\)')
MAX_FILE_BYTES = 10 * 1024 * 1024


class SkillError(ValueError):
    """Skill creation or verification failed."""


def _read_utf8(path: Path) -> str:
    try:
        return path.read_text(encoding='utf-8')
    except (UnicodeError, OSError) as exc:
        raise SkillError(f'Cannot read UTF-8 file: {path} ({exc})') from exc


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    if not content.startswith('---\n'):
        raise SkillError('SKILL.md must begin with YAML frontmatter (---)')
    match = re.search(r'^---\s*$', content[4:], flags=re.MULTILINE)
    if not match:
        raise SkillError('SKILL.md has no closing frontmatter delimiter')
    raw = content[4:4 + match.start()]
    body = content[4 + match.end():]
    try:
        meta = yaml.safe_load(raw)
    except yaml.YAMLError as exc:
        raise SkillError(f'Invalid YAML frontmatter: {exc}') from exc
    if not isinstance(meta, dict):
        raise SkillError('YAML frontmatter must be a mapping')
    return meta, body


def _check_name(name: str) -> None:
    if not isinstance(name, str) or not (1 <= len(name) <= 64) or not NAME_PATTERN.fullmatch(name):
        raise SkillError('Skill name must be 1–64 lowercase letters, digits or single hyphens; no leading/trailing hyphen')


def _check_text(value: str, label: str, maximum: int) -> None:
    if not isinstance(value, str) or not value.strip() or len(value) > maximum:
        raise SkillError(f'{label} must be nonempty and at most {maximum} characters')


def _files_under(root: Path) -> list[Path]:
    if not root.is_dir() or root.is_symlink():
        raise SkillError(f'Not a real skill directory: {root}')
    files = []
    for candidate in sorted(root.rglob('*')):
        if candidate.is_symlink():
            raise SkillError(f'Symlinks are forbidden: {candidate.relative_to(root)}')
        if not candidate.is_file():
            continue
        if candidate.stat().st_size > MAX_FILE_BYTES:
            raise SkillError(f'File too large: {candidate.relative_to(root)}')
        files.append(candidate)
    return files


def validate_skill(root: Path) -> list[str]:
    """Return static validation errors; no side effects."""
    root = Path(root)
    errors: list[str] = []
    try:
        files = _files_under(root)
    except SkillError as exc:
        return [str(exc)]
    front = root / 'SKILL.md'
    if front not in files:
        return ['Missing SKILL.md']
    try:
        meta, body = _parse_frontmatter(_read_utf8(front))
        name = meta.get('name')
        _check_name(name)
        if name != root.name:
            errors.append(f'Skill name {name!r} does not match directory {root.name!r}')
        _check_text(meta.get('description'), 'description', 1024)
        if not body.strip():
            errors.append('SKILL.md body is empty')
        if PLACEHOLDER_PATTERN.search(body):
            errors.append('SKILL.md includes an unfinished placeholder')
        for destination in MARKDOWN_LINK_PATTERN.findall(body):
            parsed = urlparse(destination)
            if parsed.scheme or destination.startswith(('#', '//', 'mailto:')):
                continue
            clean = unquote(destination.split('#', 1)[0].split('?', 1)[0])
            if not clean:
                continue
            candidate = (root / clean).resolve()
            if not candidate.is_relative_to(root.resolve()):
                errors.append(f'Path escapes skill directory: {destination}')
            elif not candidate.is_file():
                errors.append(f'Referenced local file missing: {destination}')
    except SkillError as exc:
        errors.append(str(exc))

    agents_file = root / 'agents' / 'openai.yaml'
    if agents_file in files:
        try:
            agent_meta = yaml.safe_load(_read_utf8(agents_file))
            interface = agent_meta.get('interface') if isinstance(agent_meta, dict) else None
            if not isinstance(interface, dict):
                errors.append('agents/openai.yaml must contain interface mapping')
            else:
                for key in ('display_name', 'short_description', 'default_prompt'):
                    _check_text(interface.get(key), f'interface.{key}', 1024)
        except (SkillError, yaml.YAMLError) as exc:
            errors.append(f'Invalid agents/openai.yaml: {exc}')
    return errors


def create_skill(*, root: Path, name: str, description: str,
                 instructions_path: Path, display_name: str,
                 short_description: str, default_prompt: str) -> Path:
    """Create a fully written skill from user-supplied instructions; no TODO template."""
    _check_name(name)
    _check_text(description, 'description', 1024)
    _check_text(display_name, 'display_name', 200)
    _check_text(short_description, 'short_description', 200)
    _check_text(default_prompt, 'default_prompt', 1024)
    body = _read_utf8(Path(instructions_path)).strip() + '\n'
    if not body.strip() or PLACEHOLDER_PATTERN.search(body):
        raise SkillError('Provided instructions are empty or contain unresolved placeholders')
    parent = Path(root)
    parent.mkdir(parents=True, exist_ok=True)
    target = parent / name
    if target.exists() or target.is_symlink():
        raise SkillError(f'Skill already exists; do not overwrite: {target}')
    staging = Path(tempfile.mkdtemp(prefix='.skillforge-', dir=parent))
    try:
        (staging / 'agents').mkdir()
        frontmatter = yaml.safe_dump({'name': name, 'description': description},
                                     allow_unicode=True, sort_keys=False, width=10000)
        (staging / 'SKILL.md').write_text(f'---\n{frontmatter}---\n\n{body}', encoding='utf-8')
        interface = {'interface': {'display_name': display_name,
                                   'short_description': short_description,
                                   'default_prompt': default_prompt}}
        (staging / 'agents' / 'openai.yaml').write_text(
            yaml.safe_dump(interface, allow_unicode=True, sort_keys=False), encoding='utf-8')
        # Validation requires the final folder name, so validate source semantics directly first.
        meta, _ = _parse_frontmatter(_read_utf8(staging / 'SKILL.md'))
        if meta['name'] != name:
            raise SkillError('Generated name mismatch')
        staging.rename(target)
        problems = validate_skill(target)
        if problems:
            shutil.rmtree(target)
            raise SkillError('; '.join(problems))
        return target
    finally:
        if staging.exists():
            shutil.rmtree(staging)


def package_skill(root: Path, destination: Path) -> str:
    """Create deterministic ZIP with exactly one skill root, and .sha256 file."""
    root = Path(root)
    destination = Path(destination)
    problems = validate_skill(root)
    if problems:
        raise SkillError('; '.join(problems))
    files = _files_under(root)
    if destination.is_relative_to(root):
        raise SkillError('ZIP destination must be outside the skill directory')
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temp_dir:
        temp_zip = Path(temp_dir) / 'bundle.zip'
        with zipfile.ZipFile(temp_zip, mode='w', compression=zipfile.ZIP_DEFLATED,
                             compresslevel=9) as z:
            for file in files:
                info = zipfile.ZipInfo(f'{root.name}/{file.relative_to(root).as_posix()}',
                                       date_time=(1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = (0o100644 << 16)
                z.writestr(info, file.read_bytes(), compress_type=zipfile.ZIP_DEFLATED,
                           compresslevel=9)
        digest = hashlib.sha256(temp_zip.read_bytes()).hexdigest()
        temp_zip.replace(destination)
        destination.with_name(destination.name + '.sha256').write_text(
            f'{digest}  {destination.name}\n', encoding='utf-8')
    return digest


def catalog_skills(roots: list[Path]) -> dict:
    """Inventory all skill instances; distinguish names from mirrored copies."""
    instances = []
    for root in roots:
        if not Path(root).exists():
            continue
        for skill_file in sorted(Path(root).rglob('SKILL.md')):
            folder = skill_file.parent
            errors = validate_skill(folder)
            instances.append({'name': folder.name, 'path': str(folder),
                              'valid': not errors, 'errors': errors})
    return {'total_instances': len(instances),
            'unique_names': len({x['name'] for x in instances}),
            'invalid_instances': sum(not x['valid'] for x in instances),
            'instances': instances}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='OMEGA Skill Creator — offline Agent Skills tool')
    sub = parser.add_subparsers(dest='command', required=True)
    make = sub.add_parser('create', help='Create a complete skill from authored Markdown')
    make.add_argument('--root', required=True, type=Path)
    make.add_argument('--name', required=True)
    make.add_argument('--description', required=True)
    make.add_argument('--instructions', required=True, type=Path)
    make.add_argument('--display-name', required=True)
    make.add_argument('--short-description', required=True)
    make.add_argument('--default-prompt', required=True)
    val = sub.add_parser('validate', help='Validate a skill folder')
    val.add_argument('skill', type=Path)
    pack = sub.add_parser('package', help='Validate and create deterministic ZIP')
    pack.add_argument('skill', type=Path)
    pack.add_argument('output', type=Path)
    cat = sub.add_parser('catalog', help='Report skill instances, unique names and errors')
    cat.add_argument('roots', type=Path, nargs='+')
    args = parser.parse_args(argv)
    try:
        if args.command == 'create':
            output = create_skill(root=args.root, name=args.name,
                                  description=args.description,
                                  instructions_path=args.instructions,
                                  display_name=args.display_name,
                                  short_description=args.short_description,
                                  default_prompt=args.default_prompt)
            print(json.dumps({'created': str(output)}, ensure_ascii=False))
        elif args.command == 'validate':
            errors = validate_skill(args.skill)
            print(json.dumps({'valid': not errors, 'errors': errors}, ensure_ascii=False))
            return 1 if errors else 0
        elif args.command == 'package':
            digest = package_skill(args.skill, args.output)
            print(json.dumps({'archive': str(args.output), 'sha256': digest}))
        elif args.command == 'catalog':
            result = catalog_skills(args.roots)
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 1 if result['invalid_instances'] else 0
    except (SkillError, OSError) as exc:
        print(json.dumps({'error': str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
