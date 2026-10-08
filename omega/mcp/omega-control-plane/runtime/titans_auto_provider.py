from __future__ import annotations

import importlib.util
import math
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


def _native_vectors(payload: Dict[str, Any]) -> list[list[list[float]]]:
    vectors = payload.get("vectors")
    if not isinstance(vectors, list) or not vectors:
        raise ValueError("vectors must be a non-empty nested list")

    if isinstance(vectors[0], list) and vectors[0] and not isinstance(vectors[0][0], list):
        batches = [vectors]
    elif (
        isinstance(vectors[0], list)
        and vectors[0]
        and isinstance(vectors[0][0], list)
    ):
        batches = vectors
    else:
        raise ValueError("vectors must have shape [T,D] or [B,T,D]")

    normalized: list[list[list[float]]] = []
    dim = None
    for batch in batches:
        if not isinstance(batch, list) or not batch:
            raise ValueError("vectors must contain non-empty sequences")
        normalized_batch: list[list[float]] = []
        for row in batch:
            if not isinstance(row, list) or not row:
                raise ValueError("vectors must contain non-empty vectors")
            values = [float(value) for value in row]
            if not all(math.isfinite(value) for value in values):
                raise ValueError("vectors must contain finite numeric values")
            if dim is None:
                dim = len(values)
            if len(values) != dim:
                raise ValueError("vector dimension changed within payload")
            normalized_batch.append(values)
        normalized.append(normalized_batch)
    return normalized


def _identity(dim: int) -> list[list[float]]:
    return [[1.0 if row == col else 0.0 for col in range(dim)] for row in range(dim)]


def _zeros(dim: int) -> list[list[float]]:
    return [[0.0 for _ in range(dim)] for _ in range(dim)]


def _matvec(matrix: list[list[float]], vector: list[float]) -> list[float]:
    return [
        sum(weight * value for weight, value in zip(row, vector))
        for row in matrix
    ]


def _native_state(session: str, dim: int):
    state = _NATIVE.get(session)
    if state is None:
        state = {
            "W": _identity(dim),
            "M": _zeros(dim),
            "dim": dim,
            "updates": 0,
        }
        _NATIVE[session] = state
    if state["dim"] != dim:
        raise ValueError("session embedding dimension changed")
    return state


def _native_memorize(payload: Dict[str, Any], *, recall: bool) -> Dict[str, Any]:
    session = str(payload.get("session_id") or uuid.uuid4())
    x = _native_vectors(payload)
    dim = len(x[0][0])
    state = _native_state(session, dim)
    W = state["W"]
    M = state["M"]
    lr = float(payload.get("learning_rate", 0.03))
    momentum = float(payload.get("momentum", 0.9))
    decay = float(payload.get("weight_decay", 0.999))

    flat = [row for batch in x for row in batch]
    if not recall:
        for index in range(max(0, len(flat) - 1)):
            key = flat[index]
            target = flat[index + 1]
            pred = _matvec(W, key)
            err = [predicted - expected for predicted, expected in zip(pred, target)]
            norm = max(sum(value * value for value in key), 1e-6)
            for row in range(dim):
                for col in range(dim):
                    grad = (err[row] * key[col]) / norm
                    M[row][col] = momentum * M[row][col] + grad
                    W[row][col] = decay * W[row][col] - lr * M[row][col]
            state["updates"] += 1

    transformed = [
        [_matvec(W, row) for row in batch]
        for batch in x
    ]
    transformed_flat = [row for batch in transformed for row in batch]
    pooled = [
        sum(row[axis] for row in transformed_flat) / len(transformed_flat)
        for axis in range(dim)
    ]
    return {
        "session_id": session,
        "retrieved": pooled,
        "dim": dim,
        "sequence_length": len(x[0]),
        "updates": int(state["updates"]),
        "backend": "omega-native-titans-fast-weight-memory",
        "provenance": {
            "official": False,
            "research_equivalent": False,
            "semantic_contract": "Titans-inspired test-time fast-weight memory",
            "dependency_free": True,
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
        "provenance": {
            "official": False,
            "research_equivalent": "unofficial-open-source-implementation",
        },
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
    dim = int(payload.get("dim", 16))
    length = int(payload.get("sequence_length", 32))
    if dim < 1 or dim > 4096:
        raise ValueError("dim must be between 1 and 4096")
    if length < 2 or length > 4096:
        raise ValueError("sequence_length must be between 2 and 4096")
    session = str(payload.get("session_id") or f"smoke-{uuid.uuid4()}")
    total = length * dim
    denom = max(total - 1, 1)
    vectors = [
        [-1.0 + (2.0 * ((row * dim) + col) / denom) for col in range(dim)]
        for row in range(length)
    ]
    first = _run({"session_id": session, "vectors": vectors}, recall=False)
    second = _run({"session_id": session, "vectors": vectors}, recall=True)
    vals = second.get("retrieved") or []
    finite = all(isinstance(value, (int, float)) and math.isfinite(float(value)) for value in vals)
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
            "ready": True,
            "backend": "lucidrains-titans-pytorch" if external else "omega-native-titans-fast-weight-memory",
            "external_runtime_ready": external,
            "dependencies": {
                "torch": _has("torch"),
                "titans_pytorch": _has("titans_pytorch"),
            },
            "capabilities": ["titans.memorize", "titans.recall", "titans.smoke"],
            "provenance": {
                "official": False,
                "research_equivalent": False,
                "fallback_active": not external,
                "fallback_dependency_free": True,
            },
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
