#!/usr/bin/env python3
"""OMEGA Tools Creator: portable, safe, declarative MCP tool contracts (stdlib)."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

VERSION = '1.0.0'
SERVER_NAME = re.compile(r'^[a-z][a-z0-9-]{2,63}$')
TOOL_NAME = re.compile(r'^[a-z][a-z0-9_]{1,63}$')
READ_HINTS = {
    'readOnlyHint': True,
    'destructiveHint': False,
    'idempotentHint': True,
    'openWorldHint': False,
}


def schema(properties: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {'type': 'object', 'properties': properties,
            'required': list(properties), 'additionalProperties': False}


STRING = {'type': 'string', 'maxLength': 4096}
NUMBER = {'type': 'number'}
OBJECT = {'type': 'object', 'maxProperties': 1000}
ARRAY = {'type': 'array', 'maxItems': 10000}
OPERATIONS: dict[str, dict[str, Any]] = {
    'echo_text': schema({'text': STRING}),
    'uppercase_text': schema({'text': STRING}),
    'lowercase_text': schema({'text': STRING}),
    'reverse_text': schema({'text': STRING}),
    'sum_numbers': schema({'a': NUMBER, 'b': NUMBER}),
    'select_field': schema({'document': OBJECT, 'key': STRING}),
    'count_items': schema({'items': ARRAY}),
}


def make_tool(name: str, description: str, operation: str) -> dict[str, Any]:
    if not TOOL_NAME.fullmatch(name):
        raise ValueError('tool name must match ^[a-z][a-z0-9_]{1,63}$')
    if not isinstance(description, str) or not (3 <= len(description.strip()) <= 1000):
        raise ValueError('tool description length must be 3..1000')
    if operation not in OPERATIONS:
        raise ValueError('operation not supported: ' + operation)
    # JSON round-trip prevents mutable shared references to the schema templates.
    return {'name': name, 'description': description.strip(), 'operation': operation,
            'inputSchema': json.loads(json.dumps(OPERATIONS[operation])),
            'annotations': dict(READ_HINTS)}


def new_contract(server_name: str, server_description: str,
                 tool_name: str, tool_description: str, operation: str) -> dict[str, Any]:
    if not SERVER_NAME.fullmatch(server_name):
        raise ValueError('server name must match ^[a-z][a-z0-9-]{2,63}$')
    if not isinstance(server_description, str) or not (3 <= len(server_description.strip()) <= 1000):
        raise ValueError('server description length must be 3..1000')
    return {'contract_version': VERSION,
            'server': {'name': server_name, 'description': server_description.strip()},
            'tools': [make_tool(tool_name, tool_description, operation)]}


def add_tool(contract: dict[str, Any], name: str, description: str, operation: str) -> None:
    candidate = make_tool(name, description, operation)
    if any(t.get('name') == name for t in contract.get('tools', []) if isinstance(t, dict)):
        raise ValueError('duplicate tool name: ' + name)
    contract['tools'].append(candidate)
    issues = validate(contract)
    if issues:
        contract['tools'].pop()
        raise ValueError('; '.join(issues))


def validate(contract: Any) -> list[str]:
    problems: list[str] = []
    if not isinstance(contract, dict):
        return ['contract must be an object']
    if set(contract) != {'contract_version', 'server', 'tools'}:
        problems.append('contract keys must be contract_version, server, tools')
    if contract.get('contract_version') != VERSION:
        problems.append('unsupported contract_version')
    server = contract.get('server')
    if not isinstance(server, dict) or set(server) != {'name', 'description'}:
        problems.append('server must have name and description')
    else:
        if not isinstance(server['name'], str) or not SERVER_NAME.fullmatch(server['name']):
            problems.append('invalid server name')
        if not isinstance(server['description'], str) or not (3 <= len(server['description'].strip()) <= 1000):
            problems.append('invalid server description')
    tools = contract.get('tools')
    if not isinstance(tools, list) or not 1 <= len(tools) <= 100:
        return problems + ['tools must contain 1..100 entries']
    seen = set()
    for i, item in enumerate(tools):
        loc = f'tools[{i}]'
        if not isinstance(item, dict) or set(item) != {'name', 'description', 'operation', 'inputSchema', 'annotations'}:
            problems.append(loc + ': tool fields invalid')
            continue
        name = item['name']
        if not isinstance(name, str) or not TOOL_NAME.fullmatch(name):
            problems.append(loc + ': invalid tool name')
        elif name in seen:
            problems.append(loc + ': duplicate tool name ' + name)
        else:
            seen.add(name)
        if not isinstance(item['description'], str) or not (3 <= len(item['description'].strip()) <= 1000):
            problems.append(loc + ': invalid tool description')
        operation = item['operation']
        if not isinstance(operation, str) or operation not in OPERATIONS:
            problems.append(loc + ': unsupported operation')
        elif item['inputSchema'] != OPERATIONS[operation]:
            problems.append(loc + ': inputSchema differs from supported operation contract')
        if item['annotations'] != READ_HINTS:
            problems.append(loc + ': annotations must match verified local read-only implementation')
    return problems


def read_contract(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding='utf-8'))
    errors = validate(data)
    if errors:
        raise ValueError('\n'.join(errors))
    return data


def write_contract(path: Path, contract: dict[str, Any]) -> None:
    errors = validate(contract)
    if errors:
        raise ValueError('\n'.join(errors))
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8') as stream:
        json.dump(contract, stream, indent=2, ensure_ascii=False)
        stream.write('\n')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description='OMEGA Tools Creator v1.0.0')
    subs = parser.add_subparsers(dest='command', required=True)
    first = subs.add_parser('new', help='create a new standalone contract')
    first.add_argument('--server', required=True)
    first.add_argument('--server-description', required=True)
    first.add_argument('--name', required=True)
    first.add_argument('--description', required=True)
    first.add_argument('--operation', choices=tuple(OPERATIONS), required=True)
    first.add_argument('--out', type=Path, required=True)
    append = subs.add_parser('add', help='add a tool to a contract')
    append.add_argument('contract', type=Path)
    append.add_argument('--name', required=True)
    append.add_argument('--description', required=True)
    append.add_argument('--operation', choices=tuple(OPERATIONS), required=True)
    verify = subs.add_parser('verify', help='validate a contract')
    verify.add_argument('contract', type=Path)
    ls = subs.add_parser('list', help='list declared tools')
    ls.add_argument('contract', type=Path)
    h = subs.add_parser('sha256', help='print a content digest')
    h.add_argument('contract', type=Path)
    args = parser.parse_args()
    try:
        if args.command == 'new':
            contract = new_contract(args.server, args.server_description,
                                    args.name, args.description, args.operation)
            write_contract(args.out, contract)
            print(args.out)
        elif args.command == 'add':
            contract = read_contract(args.contract)
            add_tool(contract, args.name, args.description, args.operation)
            temp = args.contract.with_name(args.contract.name + '.tmp')
            write_contract(temp, contract)
            temp.replace(args.contract)
            print(args.contract)
        elif args.command == 'verify':
            read_contract(args.contract)
            print('PASS', args.contract)
        elif args.command == 'list':
            contract = read_contract(args.contract)
            for tool in contract['tools']:
                print(tool['name'], tool['operation'], tool['description'], sep='\t')
        else:
            read_contract(args.contract)
            print(digest(args.contract))
        return 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        parser.exit(2, f'ERROR: {error}\n')


if __name__ == '__main__':
    raise SystemExit(main())
