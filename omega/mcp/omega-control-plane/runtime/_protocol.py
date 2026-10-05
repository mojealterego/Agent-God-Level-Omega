from __future__ import annotations

import json
import sys
import traceback
from typing import Any, Callable, Dict


def serve(handler: Callable[[str, Dict[str, Any]], Any]) -> None:
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        req_id = None
        try:
            req = json.loads(raw)
            req_id = str(req.get("id", ""))
            operation = req.get("operation")
            payload = req.get("payload") or {}
            if not isinstance(operation, str) or not operation:
                raise ValueError("operation is required")
            if not isinstance(payload, dict):
                raise TypeError("payload must be an object")
            result = handler(operation, payload)
            response = {"id": req_id, "ok": True, "result": result}
        except Exception as exc:  # provider boundary: return structured failure
            response = {
                "id": req_id,
                "ok": False,
                "error": {
                    "code": exc.__class__.__name__,
                    "message": str(exc),
                    "trace": traceback.format_exc(limit=3),
                },
            }
        sys.stdout.write(json.dumps(response, ensure_ascii=False, separators=(",", ":")) + "\n")
        sys.stdout.flush()
