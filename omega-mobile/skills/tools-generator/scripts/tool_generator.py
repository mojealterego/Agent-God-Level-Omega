#!/usr/bin/env python3
"""OMEGA Tools Generator: deterministic MCP SDK v2 server generation from reviewed contracts."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
from pathlib import Path
from typing import Any

MODULE = Path(__file__).with_name('tool_contract.py')
spec = importlib.util.spec_from_file_location('omega_tool_contract', MODULE)
policy = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(policy)

# Whitelisted signatures; external code, shell, network and arbitrary Python are never generated.
SIGNATURES: dict[str, tuple[str, str, str]] = {
    'echo_text': ('text: str', "{'text': text}", 'str'),
    'uppercase_text': ('text: str', "{'text': text}", 'str'),
    'lowercase_text': ('text: str', "{'text': text}", 'str'),
    'reverse_text': ('text: str', "{'text': text}", 'str'),
    'sum_numbers': ('a: float, b: float', "{'a': a, 'b': b}", 'float'),
    'select_field': ('document: dict[str, Any], key: str', "{'document': document, 'key': key}", 'dict[str, Any]'),
    'count_items': ('items: list[Any]', "{'items': items}", 'int'),
}


def generate(contract: dict[str, Any], destination: Path) -> Path:
    errors = policy.validate(contract)
    if errors:
        raise ValueError('; '.join(errors))
    if destination.exists() or destination.is_symlink():
        raise FileExistsError(f'destination already exists: {destination}')
    if destination.parent.exists() and destination.parent.is_symlink():
        raise ValueError('refusing symlink destination parent')
    tools = contract['tools']
    destination.mkdir(parents=True)
    try:
        (destination / 'tool_contract.json').write_text(
            json.dumps(contract, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        (destination / 'tool_runtime.py').write_text(runtime_source(contract), encoding='utf-8')
        (destination / 'server.py').write_text(server_source(contract), encoding='utf-8')
        (destination / 'requirements.txt').write_text('mcp>=2.0,<3.0\n', encoding='utf-8')
        tests = destination / 'tests'
        tests.mkdir()
        (tests / 'test_runtime.py').write_text(test_source(contract), encoding='utf-8')
        (destination / 'README.md').write_text(
            f'# {contract["server"]["name"]}\n\n'
            'Wygenerowany serwer MCP 2.x przez OMEGA Tools Generator.\n\n'
            '## Uruchomienie (komputer/serwer z Python 3.11+)\n\n'
            '```bash\npython -m pip install -r requirements.txt\n'
            'python -m unittest discover -s tests -v\npython server.py\n```\n\n'
            'Tryb `stdio` jest lokalny: nie jest zdalnym MCP dla ChatGPT na Androidzie. '
            'Do zdalnego hostingu trzeba osobno zapewnić HTTPS, uwierzytelnienie i wdrożenie.\n\n'
            'Dostępne operacje są lokalne, deterministyczne i tylko do odczytu. '
            'Narzędzie nie otwiera powłoki, nie pobiera tokenów i nie wywołuje sieci.\n\n'
            f'Liczba narzędzi: {len(tools)}. Źródło kontraktu: `tool_contract.json`.\n',
            encoding='utf-8')
        return destination
    except Exception:
        shutil.rmtree(destination)
        raise


def runtime_source(contract: dict[str, Any]) -> str:
    encoded = repr(json.dumps(contract, ensure_ascii=False, sort_keys=True))
    schemas = repr(json.dumps(policy.OPERATIONS, ensure_ascii=False, sort_keys=True))
    return ('''"""Whitelisted, network-free business logic for generated MCP tools."""
from __future__ import annotations
import json
import math
from typing import Any

CONTRACT = json.loads(''' + encoded + ''')
EXPECTED_SCHEMAS = json.loads(''' + schemas + ''')
TOOLS = {item['name']: item for item in CONTRACT['tools']}


def _validate(tool: dict[str, Any], arguments: dict[str, Any]) -> None:
    """Check real input constraints regardless of whether an MCP client validates."""
    expected = EXPECTED_SCHEMAS.get(tool['operation'])
    if expected is None or tool['inputSchema'] != expected:
        raise ValueError('Unsupported or modified tool input schema')
    if not isinstance(arguments, dict):
        raise ValueError('Arguments must be an object')
    props = expected['properties']
    if set(arguments) != set(props):
        raise ValueError('Arguments must match the required fields exactly')
    for key, info in props.items():
        value = arguments[key]
        typ = info['type']
        if typ == 'string':
            if not isinstance(value, str) or len(value) > info['maxLength']:
                raise ValueError(f'{key} must be a bounded string')
        elif typ == 'number':
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
                raise ValueError(f'{key} must be a finite number')
        elif typ == 'object':
            if not isinstance(value, dict) or len(value) > info['maxProperties']:
                raise ValueError(f'{key} must be a bounded object')
        elif typ == 'array':
            if not isinstance(value, list) or len(value) > info['maxItems']:
                raise ValueError(f'{key} must be a bounded list')
        else:
            raise ValueError('Unsupported field type')


def execute(name: str, arguments: dict[str, Any]) -> Any:
    """Execute one approved local operation. Returns JSON-compatible data."""
    tool = TOOLS.get(name)
    if tool is None:
        raise ValueError('Unknown tool')
    _validate(tool, arguments)
    operation = tool['operation']
    if operation == 'echo_text':
        return arguments['text']
    if operation == 'uppercase_text':
        return arguments['text'].upper()
    if operation == 'lowercase_text':
        return arguments['text'].lower()
    if operation == 'reverse_text':
        return arguments['text'][::-1]
    if operation == 'sum_numbers':
        result = arguments['a'] + arguments['b']
        if not math.isfinite(result):
            raise ValueError('Numeric overflow')
        return result
    if operation == 'select_field':
        document, key = arguments['document'], arguments['key']
        # serialize-validate the result; malformed input is not leaked to MCP SDK
        result = {'found': key in document, 'value': document.get(key)}
        try:
            json.dumps(result, allow_nan=False)
        except (TypeError, ValueError) as exc:
            raise ValueError('Document value must be JSON serializable') from exc
        return result
    if operation == 'count_items':
        return len(arguments['items'])
    raise ValueError('Unsupported tool implementation')
''')


def server_source(contract: dict[str, Any]) -> str:
    head = '''"""MCP SDK 2.x entrypoint generated by OMEGA Tools Generator."""
from __future__ import annotations
from typing import Any
from mcp.server import MCPServer
from mcp.types import ToolAnnotations
from tool_runtime import execute

mcp = MCPServer(''' + repr(contract['server']['name']) + ''')
'''
    for item in contract['tools']:
        signature, params, returned = SIGNATURES[item['operation']]
        name = item['name']
        description = item['description']
        head += (f"\n\n@mcp.tool(name={name!r}, description={description!r}, "
                 "annotations=ToolAnnotations(read_only_hint=True, destructive_hint=False, "
                 "idempotent_hint=True, open_world_hint=False))\n"
                 f"def {name}({signature}) -> {returned}:\n"
                 f"    return execute({name!r}, {params})\n")
    head += "\n\nif __name__ == '__main__':\n    mcp.run(transport='stdio')\n"
    return head


def test_source(contract: dict[str, Any]) -> str:
    cases = {
        'echo_text': ({'text': 'aBc'}, 'aBc'),
        'uppercase_text': ({'text': 'aBc'}, 'ABC'),
        'lowercase_text': ({'text': 'aBc'}, 'abc'),
        'reverse_text': ({'text': 'aBc'}, 'cBa'),
        'sum_numbers': ({'a': 2, 'b': 3.5}, 5.5),
        'select_field': ({'document': {'x': False}, 'key': 'x'}, {'found': True, 'value': False}),
        'count_items': ({'items': [4, 5, 6]}, 3),
    }
    text = '''"""Deterministic unit tests, run offline without the MCP SDK."""
import unittest
from tool_runtime import execute, TOOLS


class ToolTests(unittest.TestCase):
    def test_declared_tools_are_registered(self):
        self.assertEqual(set(TOOLS), ''' + repr({x['name'] for x in contract['tools']}) + ''')
'''
    for item in contract['tools']:
        arg, expected = cases[item['operation']]
        text += (f"\n    def test_{item['name']}(self):\n"
                 f"        self.assertEqual(execute({item['name']!r}, {arg!r}), {expected!r})\n")
    text += "\n    def test_missing_tool(self):\n        with self.assertRaises(ValueError):\n            execute('unknown_operation', {})\n"
    text += "\n\nif __name__ == '__main__':\n    unittest.main()\n"
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description='OMEGA Tools Generator v1.0.0')
    parser.add_argument('contract', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    try:
        contract = policy.read_contract(args.contract)
        output = generate(contract, args.out)
        print('GENERATED:', output)
        return 0
    except (ValueError, OSError, json.JSONDecodeError) as error:
        parser.exit(2, f'ERROR: {error}\n')


if __name__ == '__main__':
    raise SystemExit(main())
