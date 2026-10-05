from __future__ import annotations

import importlib.util
import os
from pathlib import Path
from typing import Any, Dict, Tuple

from _protocol import serve

MODEL_ID = os.environ.get("OMEGA_JEPA_MODEL", "facebook/vjepa2-vitl-fpc64-256")
_MODEL = None
_PROCESSOR = None
_DEVICE = None


def _deps() -> Dict[str, bool]:
    return {
        "torch": importlib.util.find_spec("torch") is not None,
        "transformers": importlib.util.find_spec("transformers") is not None,
        "torchcodec": importlib.util.find_spec("torchcodec") is not None,
        "numpy": importlib.util.find_spec("numpy") is not None,
    }


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


def _load() -> Tuple[Any, Any, str]:
    global _MODEL, _PROCESSOR, _DEVICE
    if _MODEL is not None:
        return _MODEL, _PROCESSOR, _DEVICE
    missing = [name for name, ok in _deps().items() if not ok]
    if missing:
        raise RuntimeError(f"Missing V-JEPA 2 runtime dependencies: {', '.join(missing)}")
    import torch
    from transformers import AutoModel, AutoVideoProcessor

    _DEVICE = _pick_device(torch)
    _PROCESSOR = AutoVideoProcessor.from_pretrained(MODEL_ID)
    _MODEL = AutoModel.from_pretrained(MODEL_ID)
    _MODEL.eval()
    _MODEL.to(_DEVICE)
    return _MODEL, _PROCESSOR, _DEVICE


def _sample_video(path: str, frame_count: int):
    import numpy as np
    from torchcodec.decoders import VideoDecoder

    video_path = Path(path).expanduser().resolve()
    if not video_path.is_file():
        raise FileNotFoundError(f"video_path does not exist: {video_path}")
    decoder = VideoDecoder(str(video_path))
    total = None
    try:
        total = int(decoder.metadata.num_frames)
    except Exception:
        try:
            total = len(decoder)
        except Exception:
            pass
    if not total or total <= 0:
        raise RuntimeError("Unable to determine video frame count")
    indices = np.linspace(0, total - 1, num=min(frame_count, total), dtype=np.int64)
    if len(indices) < frame_count:
        indices = np.pad(indices, (0, frame_count - len(indices)), mode="edge")
    return decoder.get_frames_at(indices=indices).data


def _embedding(payload: Dict[str, Any]) -> Dict[str, Any]:
    import torch

    model, processor, device = _load()
    path = payload.get("video_path")
    if not path:
        raise ValueError("jepa.embed requires video_path")
    frame_count = int(payload.get("frames") or getattr(model.config, "frames_per_clip", 64) or 64)
    if frame_count < 1 or frame_count > 512:
        raise ValueError("frames must be between 1 and 512")
    video = _sample_video(path, frame_count)
    inputs = processor(video, return_tensors="pt")
    inputs = {k: v.to(device) if hasattr(v, "to") else v for k, v in inputs.items()}
    with torch.no_grad():
        features = model.get_vision_features(**inputs)
    # Preserve a compact, deterministic vector rather than dumping all video tokens.
    pooled = features.float()
    while pooled.ndim > 2:
        pooled = pooled.mean(dim=1)
    vector = pooled[0].detach().cpu().tolist()
    max_dims = int(payload.get("max_dims", 4096))
    if max_dims < 1 or max_dims > 16384:
        raise ValueError("max_dims must be between 1 and 16384")
    truncated = len(vector) > max_dims
    return {
        "model": MODEL_ID,
        "device": device,
        "frames": frame_count,
        "embedding": vector[:max_dims],
        "embedding_dim": len(vector),
        "truncated": truncated,
    }



def _smoke(payload: Dict[str, Any]) -> Dict[str, Any]:
    import numpy as np
    import torch

    model, processor, device = _load()
    frame_count = int(payload.get("frames") or getattr(model.config, "frames_per_clip", 64) or 64)
    image_size = int(payload.get("image_size") or getattr(model.config, "image_size", 256) or 256)
    if frame_count < 1 or frame_count > 128:
        raise ValueError("frames must be between 1 and 128 for smoke inference")
    if image_size < 32 or image_size > 512:
        raise ValueError("image_size must be between 32 and 512")
    video = np.zeros((frame_count, image_size, image_size, 3), dtype=np.uint8)
    inputs = processor(video, return_tensors="pt")
    inputs = {k: v.to(device) if hasattr(v, "to") else v for k, v in inputs.items()}
    with torch.no_grad():
        features = model.get_vision_features(**inputs)
    finite = bool(torch.isfinite(features).all().item())
    return {
        "verified": finite and features.numel() > 0,
        "model": MODEL_ID,
        "device": device,
        "frames": frame_count,
        "image_size": image_size,
        "shape": list(features.shape),
        "finite": finite,
    }

def handle(operation: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if operation == "health":
        deps = _deps()
        return {
            "ready": all(deps.values()),
            "backend": "meta-vjepa2-huggingface",
            "model": MODEL_ID,
            "dependencies": deps,
            "model_loaded": _MODEL is not None,
            "capabilities": ["jepa.embed", "jepa.smoke"],
        }
    if operation == "jepa.embed":
        return _embedding(payload)
    if operation == "jepa.smoke":
        return _smoke(payload)
    raise ValueError(f"Unsupported V-JEPA 2 operation: {operation}")


if __name__ == "__main__":
    serve(handle)
