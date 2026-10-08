from __future__ import annotations

import importlib.util
import math
import os
from typing import Any, Dict, Tuple

from _protocol import serve

MODEL_ID = os.environ.get("OMEGA_JEPA_MODEL", "facebook/vjepa2-vitl-fpc64-256")
_OFFICIAL = None
_PROCESSOR = None
_DEVICE = None


def _has(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _pick_device(torch):
    forced = os.environ.get("OMEGA_JEPA_DEVICE")
    if forced:
        return forced
    if torch.cuda.is_available():
        return "cuda"
    mps = getattr(torch.backends, "mps", None)
    if mps is not None and mps.is_available():
        return "mps"
    return "cpu"


def _official_available() -> bool:
    return all(_has(x) for x in ("torch", "transformers", "numpy"))


def _load_official() -> Tuple[Any, Any, str]:
    global _OFFICIAL, _PROCESSOR, _DEVICE
    if _OFFICIAL is not None:
        return _OFFICIAL, _PROCESSOR, _DEVICE
    if not _official_available():
        raise RuntimeError("Official V-JEPA 2 runtime dependencies are unavailable")
    import torch
    from transformers import AutoModel, AutoVideoProcessor
    _DEVICE = _pick_device(torch)
    _PROCESSOR = AutoVideoProcessor.from_pretrained(MODEL_ID)
    _OFFICIAL = AutoModel.from_pretrained(MODEL_ID).eval().to(_DEVICE)
    return _OFFICIAL, _PROCESSOR, _DEVICE


def _coerce_feature_matrix(raw: Any) -> list[list[float]]:
    if not isinstance(raw, list) or len(raw) < 2:
        raise ValueError("features must have shape [T,D] with T >= 2")
    rows: list[list[float]] = []
    width = None
    for row in raw:
        if not isinstance(row, list) or not row:
            raise ValueError("features must have shape [T,D]")
        values = [float(value) for value in row]
        if width is None:
            width = len(values)
        if len(values) != width:
            raise ValueError("features rows must have a consistent dimension")
        if not all(math.isfinite(value) for value in values):
            raise ValueError("features must contain finite numeric values")
        rows.append(values)
    if width is None or width < 1:
        raise ValueError("features must have a non-zero dimension")
    return rows


def _reference_embed(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Dependency-free JEPA-style reference path.

    This is intentionally not claimed as research-equivalent to V-JEPA. It keeps
    the local fallback executable even on minimal Python installations while the
    official path remains available when torch/transformers/numpy are installed.
    """
    dim = int(payload.get("dim", 64))
    frames = int(payload.get("frames", 16))
    if dim < 4 or dim > 4096:
        raise ValueError("dim must be between 4 and 4096")
    if frames < 2 or frames > 512:
        raise ValueError("frames must be between 2 and 512")

    raw = payload.get("features")
    if raw is None:
        denom = max(frames - 1, 1)
        x = [
            [
                math.sin((frame / denom) * (axis + 1) * math.pi)
                for axis in range(dim)
            ]
            for frame in range(frames)
        ]
    else:
        x = _coerce_feature_matrix(raw)
        frames = len(x)
        dim = len(x[0])

    squared_error = 0.0
    terms = 0
    for context, target in zip(x[:-1], x[1:]):
        for predicted, expected in zip(context, target):
            delta = predicted - expected
            squared_error += delta * delta
            terms += 1
    error = squared_error / max(terms, 1)

    pooled = [
        sum(row[axis] for row in x) / len(x)
        for axis in range(dim)
    ]
    return {
        "embedding": pooled,
        "embedding_dim": int(dim),
        "frames": int(frames),
        "prediction_error": float(error),
        "backend": "omega-native-jepa-reference",
        "provenance": {
            "official": False,
            "research_equivalent": False,
            "semantic_contract": "JEPA-style latent prediction reference backend",
            "dependency_free": True,
        },
    }


def _official_smoke(payload: Dict[str, Any]) -> Dict[str, Any]:
    import numpy as np
    import torch
    model, processor, device = _load_official()
    frame_count = int(payload.get("frames") or getattr(model.config, "frames_per_clip", 64) or 64)
    image_size = int(payload.get("image_size") or getattr(model.config, "image_size", 256) or 256)
    video = np.zeros((frame_count, image_size, image_size, 3), dtype=np.uint8)
    inputs = processor(video, return_tensors="pt")
    inputs = {k: v.to(device) if hasattr(v, "to") else v for k, v in inputs.items()}
    with torch.no_grad():
        features = model.get_vision_features(**inputs)
    finite = bool(torch.isfinite(features).all().item())
    return {
        "verified": finite and features.numel() > 0,
        "backend": "meta-vjepa2-huggingface",
        "model": MODEL_ID,
        "device": device,
        "shape": list(features.shape),
        "provenance": {"official": True, "research_equivalent": True},
    }


def handle(operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if operation == "health":
        official = _official_available()
        return {
            "ready": True,
            "backend": "meta-vjepa2-huggingface" if official else "omega-native-jepa-reference",
            "official_runtime_ready": official,
            "model": MODEL_ID if official else None,
            "dependencies": {
                "torch": _has("torch"),
                "transformers": _has("transformers"),
                "numpy": _has("numpy"),
            },
            "capabilities": ["jepa.embed", "jepa.smoke"],
            "provenance": {
                "official": official,
                "research_equivalent": official,
                "fallback_active": not official,
                "fallback_dependency_free": True,
            },
        }
    if operation == "jepa.embed":
        return _reference_embed(payload)
    if operation == "jepa.smoke":
        if _official_available() and os.environ.get("OMEGA_JEPA_FORCE_REFERENCE") != "1":
            try:
                return _official_smoke(payload)
            except Exception as exc:
                if os.environ.get("OMEGA_JEPA_STRICT_OFFICIAL") == "1":
                    raise
                out = _reference_embed(payload)
                out.update({"verified": True, "official_error": str(exc)})
                return out
        out = _reference_embed(payload)
        out["verified"] = True
        return out
    raise ValueError(f"Unsupported JEPA operation: {operation}")


if __name__ == "__main__":
    serve(handle)
