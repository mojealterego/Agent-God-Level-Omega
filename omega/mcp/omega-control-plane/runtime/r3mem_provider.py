from __future__ import annotations

import base64
import hashlib
import importlib
import json
import os
import zlib
from typing import Any, Dict

from _protocol import serve

_BACKEND = None
_FACTORY_SPEC = os.environ.get("OMEGA_R3MEM_FACTORY", "")


class LosslessReferenceBackend:
    """Exact reversible fallback. It implements the provider contract, not the trained R3Mem network."""
    def compress(self, text: str, **options):
        raw = text.encode("utf-8")
        level = int(options.get("level", 9))
        blob = zlib.compress(raw, max(0, min(9, level)))
        return {
            "codec": "zlib+base64",
            "payload": base64.b64encode(blob).decode("ascii"),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "raw_bytes": len(raw),
            "compressed_bytes": len(blob),
            "provenance": {
                "official": False,
                "research_equivalent": False,
                "compatibility_mode": True,
                "semantic_contract": "exact reversible compression fallback",
            },
        }

    def reconstruct(self, memory, **options):
        if not isinstance(memory, dict) or memory.get("codec") != "zlib+base64":
            raise ValueError("unsupported reference memory payload")
        raw = zlib.decompress(base64.b64decode(memory["payload"]))
        digest = hashlib.sha256(raw).hexdigest()
        if digest != memory.get("sha256"):
            raise ValueError("reconstructed memory checksum mismatch")
        return raw.decode("utf-8")


def _load_backend():
    global _BACKEND
    if _BACKEND is not None:
        return _BACKEND
    if _FACTORY_SPEC:
        if ":" not in _FACTORY_SPEC:
            raise RuntimeError("OMEGA_R3MEM_FACTORY must be module:factory")
        module_name, factory_name = _FACTORY_SPEC.rsplit(":", 1)
        module = importlib.import_module(module_name)
        factory = getattr(module, factory_name)
        backend = factory()
        if not callable(getattr(backend, "compress", None)) or not callable(getattr(backend, "reconstruct", None)):
            raise TypeError("R3Mem factory must return compress/reconstruct methods")
        _BACKEND = backend
    else:
        _BACKEND = LosslessReferenceBackend()
    return _BACKEND


def _provenance(backend):
    if isinstance(backend, LosslessReferenceBackend):
        return {
            "official": False,
            "research_equivalent": False,
            "compatibility_mode": True,
            "note": "No public trained R3Mem implementation was available; using exact reversible contract fallback.",
        }
    return {
        "official": False,
        "research_equivalent": None,
        "compatibility_mode": False,
        "external_factory": _FACTORY_SPEC,
    }


def handle(operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if operation == "health":
        try:
            backend = _load_backend()
            return {
                "ready": True,
                "backend": f"{backend.__class__.__module__}.{backend.__class__.__name__}",
                "factory": _FACTORY_SPEC or None,
                "capabilities": ["r3mem.compress", "r3mem.reconstruct", "r3mem.smoke"],
                "provenance": _provenance(backend),
            }
        except Exception as exc:
            return {"ready": False, "error": str(exc), "factory": _FACTORY_SPEC or None}
    backend = _load_backend()
    if operation == "r3mem.compress":
        text = payload.get("text")
        if not isinstance(text, str) or not text:
            raise ValueError("r3mem.compress requires non-empty text")
        return {"memory": backend.compress(text, **(payload.get("options") or {})), "provenance": _provenance(backend)}
    if operation == "r3mem.reconstruct":
        if "memory" not in payload:
            raise ValueError("r3mem.reconstruct requires memory")
        return {"text": backend.reconstruct(payload["memory"], **(payload.get("options") or {})), "provenance": _provenance(backend)}
    if operation == "r3mem.smoke":
        text = str(payload.get("text") or "OMEGA R3Mem reversible compression smoke test")
        memory = backend.compress(text, **(payload.get("options") or {}))
        reconstructed = backend.reconstruct(memory, **(payload.get("options") or {}))
        return {
            "verified": reconstructed == text,
            "input_length": len(text),
            "reconstructed_length": len(reconstructed),
            "provenance": _provenance(backend),
        }
    raise ValueError(f"Unsupported R3Mem operation: {operation}")


if __name__ == "__main__":
    serve(handle)
