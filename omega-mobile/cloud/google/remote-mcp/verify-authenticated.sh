#!/usr/bin/env bash
set -Eeuo pipefail

: "${OMEGA_MCP_URL:?Set OMEGA_MCP_URL, for example https://service-xyz.run.app/mcp}"
: "${OMEGA_MCP_ACCESS_TOKEN:?Set OMEGA_MCP_ACCESS_TOKEN in the environment; never pass it on argv or commit it}"

BODY='{"jsonrpc":"2.0","id":"omega-verify","method":"tools/list","params":{}}'
HTTP="$(curl -sS -D omega-mcp-auth-headers.txt -o omega-mcp-auth-body.json -w '%{http_code}' \
  -X POST "$OMEGA_MCP_URL" \
  -H "Authorization: Bearer ${OMEGA_MCP_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data "$BODY")"
[[ "$HTTP" == 200 ]] || { echo "Authenticated MCP tools/list failed with HTTP $HTTP" >&2; cat omega-mcp-auth-body.json >&2; exit 1; }
python3 - <<'PY'
import json
from pathlib import Path
p=Path('omega-mcp-auth-body.json')
text=p.read_text(errors='replace')
# Streamable HTTP may use SSE; accept a JSON body or an SSE data line containing JSON.
if text.lstrip().startswith('{'):
    doc=json.loads(text)
else:
    lines=[line[5:].strip() for line in text.splitlines() if line.startswith('data:')]
    if not lines:
        raise SystemExit('No MCP JSON/SSE data found')
    doc=json.loads(lines[-1])
result=doc.get('result') or {}
tools=result.get('tools') or []
names={t.get('name') for t in tools}
required={'omega_capabilities','omega_host_info'}
missing=required-names
if missing:
    raise SystemExit(f'Missing expected tools: {sorted(missing)}')
print(json.dumps({'ok':True,'tool_count':len(tools),'required_tools':sorted(required)},indent=2))
PY
