from __future__ import annotations

import importlib.util
import os
import uuid
from typing import Any, Dict

from _protocol import serve

_MODELS: Dict[str, Any] = {}
_STATES: Dict[str, Any] = {}


def _deps() -> Dict[str, bool]:
    return {
        "torch": importlib.util.find_spec("torch") is not None,
        "titans_pytorch": importlib.util.find_spec("titans_pytorch") is not None,
    }


def _device(torch):
    forced = os.environ.get("OMEGA_TITANS_DEVICE")
    if forced:
        return forced
    if torch.cuda.is_available():
        return "cuda"
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return "mps"
    return "cpu"


def _tensor(payload: Dict[str, Any], torch):
    vectors = payload.get("vectors")
    if not isinstance(vectors, list) or not vectors:
        raise ValueError("vectors must be a non-empty nested list")
    x = torch.tensor(vectors, dtype=torch.float32)
    if x.ndim == 2:
        x = x.unsqueeze(0)
    if x.ndim != 3:
        raise ValueError("vectors must have shape [T,D] or [B,T,D]")
    return x


def _get_or_create_model(session: str, dim: int, chunk_size: int, torch):
    from titans_pytorch import NeuralMemory

    model = _MODELS.get(session)
    if model is not None:
        if getattr(model, "_omega_dim", dim) != dim:
            raise ValueError("session embedding dimension changed")
        return model
    model = NeuralMemory(dim=dim, chunk_size=chunk_size)
    model._omega_dim = dim
    model.eval()
    model.to(_device(torch))
    _MODELS[session] = model
    return model


def _run(payload: Dict[str, Any], *, recall: bool) -> Dict[str, Any]:
    missing = [name for name, ok in _deps().items() if not ok]
    if missing:
        raise RuntimeError(f"Missing Titans runtime dependencies: {', '.join(missing)}")
    import torch

    session = str(payload.get("session_id") or uuid.uuid4())
    x = _tensor(payload, torch)
    chunk_size = int(payload.get("chunk_size", 64))
    if chunk_size < 1 or chunk_size > 4096:
        raise ValueError("chunk_size must be between 1 and 4096")
    model = _get_or_create_model(session, int(x.shape[-1]), chunk_size, torch)
    x = x.to(next(model.parameters()).device)
    state = _STATES.get(session)
    if recall and state is None:
        raise KeyError(f"No memory state exists for session {session}")
    with torch.no_grad():
        retrieved, next_state = model(x, state=state)
    _STATES[session] = next_state
    pooled = retrieved.float().mean(dim=tuple(range(retrieved.ndim - 1))).detach().cpu().tolist()
    return {
        "session_id": session,
        "device": str(x.device),
        "retrieved": pooled,
        "dim": int(x.shape[-1]),
        "sequence_length": int(x.shape[-2]),
    }



def _smoke(payload: Dict[str, Any]) -> Dict[str, Any]:
    missing = [name for name, ok in _deps().items() if not ok]
    if missing:
        raise RuntimeError(f"Missing Titans runtime dependencies: {', '.join(missing)}")
    import torch

    dim = int(payload.get("dim", 16))
    length = int(payload.get("sequence_length", 64))
    chunk_size = int(payload.get("chunk_size", min(16, length)))
    if dim < 2 or dim > 4096:
        raise ValueError("dim must be between 2 and 4096")
    if length < 1 or length > 4096:
        raise ValueError("sequence_length must be between 1 and 4096")
    session = str(payload.get("session_id") or f"smoke-{uuid.uuid4()}")
    vectors = torch.linspace(-1.0, 1.0, steps=length * dim, dtype=torch.float32).reshape(length, dim).tolist()
    first = _run({"session_id": session, "vectors": vectors, "chunk_size": chunk_size}, recall=False)
    second = _run({"session_id": session, "vectors": vectors, "chunk_size": chunk_size}, recall=True)
    retrieved = second.get("retrieved") or []
    finite = all(isinstance(v, (int, float)) and float('-inf') < float(v) < float('inf') for v in retrieved)
    return {
        "verified": bool(retrieved) and finite,
        "session_id": session,
        "dim": dim,
        "sequence_length": length,
        "first": {"dim": first.get("dim"), "sequence_length": first.get("sequence_length")},
        "second": {"dim": second.get("dim"), "sequence_length": second.get("sequence_length")},
    }

def handle(operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if operation == "health":
        deps = _deps()
        return {
            "ready": all(deps.values()),
            "backend": "lucidrains-titans-pytorch",
            "dependencies": deps,
            "sessions": len(_STATES),
            "capabilities": ["titans.memorize", "titans.recall", "titans.smoke"],
            "official": False,
        }
    if operation == "titans.memorize":
        return _run(payload, recall=False)
    if operation == "titans.recall":
        return _run(payload, recall=True)
    if operation == "titans.smoke":
        return _smoke(payload)
    raise ValueError(f"Unsupported Titans operation: {operation}")


if __name__ == "__main__":
    serve(handle)
