#!/usr/bin/env python3
"""Produce an OMEGA MCP federation registration payload for OpenLore."""
from __future__ import annotations
import json, os, sys
def main() -> int:
    endpoint=os.environ.get("OMEGA_OPENLORE_MCP_URL","").strip()
    token_env="OMEGA_OPENLORE_TOKEN"
    if not endpoint:
        print(json.dumps({"available":False,"reason":"OMEGA_OPENLORE_MCP_URL_NOT_SET","execution":False},indent=2))
        return 2
    if not endpoint.startswith(("https://","http://")):
        raise SystemExit("OMEGA_OPENLORE_MCP_URL must be an HTTP(S) URL")
    payload={
      "cwd": os.getcwd(),
      "action":"register",
      "id":"openlore",
      "endpoint":endpoint,
      "priority":20,
      "capabilities":["knowledge.read","knowledge.search"],
      "auth":{"type":"bearer-env","env":token_env},
      "metadata":{"source":"aakarim/OpenLore","defaultAccess":"read-only","writeRequiresApproval":True}
    }
    print(json.dumps({"available":True,"omega_tool":"omega_mcp_federation","arguments":payload,"execution":False},indent=2))
    return 0
if __name__=="__main__":
    raise SystemExit(main())
