from __future__ import annotations

import importlib.util
import os
import uuid
from typing import Any, Dict

from _protocol import serve

_NATIVE: Dict[str, Dict[str, Any]] = {}
_OFFICIAL_MODELS: Dict[str, Any] = {}
_OFFICIAL_STATES: Dict[str, Any] = {}


def _has(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _official_available() -> bool:
    return _has("torch") and _has("titans_pytorch")


def _tensor(payload, torch):
    vectors = payload.get("vectors")
    if not isinstance(vectors, list) or not vectors:
        raise ValueError("vectors must be a non-empty nested list")
    x = torch.tensor(vectors, dtype=torch.float32)
    if x.ndim == 2:
        x = x.unsqueeze(0)
    if x.ndim != 3:
        raise ValueError("vectors must have shape [T,D] or [B,T,D]")
    return x


def _native_state(session: str, dim: int, torch):
    state = _NATIVE.get(session)
    if state is None:
        # Fast weights + momentum implement a real test-time associative memory update.
        state = {
            "W": torch.eye(dim, dtype=torch.float32),
            "M": torch.zeros((dim, dim), dtype=torch.float32),
            "dim": dim,
            "updates": 0,
        }
        _NATIVE[session] = state
    if state["dim"] != dim:
        raise ValueError("session embedding dimension changed")
    return state


def _native_memorize(payload: Dict[str, Any], *, recall: bool) -> Dict[str, Any]:
    import torch
    session = str(payload.get("session_id") or uuid.uuid4())
    x = _tensor(payload, torch)
    dim = int(x.shape[-1])
    state = _native_state(session, dim, torch)
    W, M = state["W"], state["M"]
    lr = float(payload.get("learning_rate", 0.03))
    momentum = float(payload.get("momentum", 0.9))
    decay = float(payload.get("weight_decay", 0.999))

    if recall:
        y = torch.einsum("ij,btj->bti", W, x)
    else:
        # Surprise-driven local fast-weight update; the target is the next latent token.
        flat = x.reshape(-1, dim)
        for i in range(max(0, flat.shape[0] - 1)):
            key = flat[i]
            target = flat[i + 1]
            pred = W @ key
            err = pred - target
            grad = torch.outer(err, key) / max(float(key.square().sum().item()), 1e-6)
            M.mul_(momentum).add_(grad)
            W.mul_(decay).add_(M, alpha=-lr)
            state["updates"] += 1
        y = torch.einsum("ij,btj->bti", W, x)

    pooled = y.mean(dim=tuple(range(y.ndim - 1))).tolist()
    return {
        "session_id": session,
        "retrieved": pooled,
        "dim": dim,
        "sequence_length": int(x.shape[-2]),
        "updates": int(state["updates"]),
        "backend": "omega-native-titans-fast-weight-memory",
        "provenance": {
            "official": False,
            "research_equivalent": False,
            "semantic_contract": "Titans-inspired test-time fast-weight memory",
        },
    }


def _official_run(payload: Dict[str, Any], *, recall: bool) -> Dict[str, Any]:
    import torch
    from titans_pytorch import NeuralMemory
    session = str(payload.get("session_id") or uuid.uuid4())
    x = _tensor(payload, torch)
    dim = int(x.shape[-1])
    model = _OFFICIAL_MODELS.get(session)
    if model is None:
        model = NeuralMemory(dim=dim, chunk_size=int(payload.get("chunk_size", 64))).eval()
        _OFFICIAL_MODELS[session] = model
    state = _OFFICIAL_STATES.get(session)
    if recall and state is None:
        raise KeyError(f"No memory state exists for session {session}")
    with torch.no_grad():
        retrieved, next_state = model(x, state=state)
    _OFFICIAL_STATES[session] = next_state
    return {
        "session_id": session,
        "retrieved": retrieved.mean(dim=tuple(range(retrieved.ndim - 1))).tolist(),
        "dim": dim,
        "sequence_length": int(x.shape[-2]),
        "backend": "lucidrains-titans-pytorch",
        "provenance": {"official": False, "research_equivalent": "unofficial-open-source-implementation"},
    }


def _run(payload: Dict[str, Any], recall: bool) -> Dict[str, Any]:
    if _official_available() and os.environ.get("OMEGA_TITANS_FORCE_NATIVE") != "1":
        try:
            return _official_run(payload, recall=recall)
        except Exception:
            if os.environ.get("OMEGA_TITANS_STRICT_EXTERNAL") == "1":
                raise
    return _native_memorize(payload, recall=recall)


def _smoke(payload: Dict[str, Any]) -> Dict[str, Any]:
    import torch
    dim = int(payload.get("dim", 16))
    length = int(payload.get("sequence_length", 32))
    session = str(payload.get("session_id") or f"smoke-{uuid.uuid4()}")
    vectors = torch.linspace(-1.0, 1.0, steps=length * dim, dtype=torch.float32).reshape(length, dim).tolist()
    first = _run({"session_id": session, "vectors": vectors}, recall=False)
    second = _run({"session_id": session, "vectors": vectors}, recall=True)
    vals = second.get("retrieved") or []
    finite = all(isinstance(v, (int, float)) and float('-inf') < float(v) < float('inf') for v in vals)
    return {
        "verified": bool(vals) and finite,
        "backend": second.get("backend"),
        "provenance": second.get("provenance"),
        "updates": first.get("updates", 0),
        "dim": dim,
        "sequence_length": length,
    }


def handle(operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if operation == "health":
        external = _official_available()
        return {
            "ready": _has("torch"),
            "backend": "lucidrains-titans-pytorch" if external else "omega-native-titans-fast-weight-memory",
            "external_runtime_ready": external,
            "dependencies": {"torch": _has("torch"), "titans_pytorch": _has("titans_pytorch")},
            "capabilities": ["titans.memorize", "titans.recall", "titans.smoke"],
            "provenance": {"official": False, "research_equivalent": False, "fallback_active": not external},
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
