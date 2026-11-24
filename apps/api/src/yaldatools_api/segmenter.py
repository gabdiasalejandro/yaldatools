"""Segmenter port and its ONNX Runtime adapter."""

from __future__ import annotations

import threading
from pathlib import Path
from typing import Protocol

import numpy as np
from PIL import Image

from .imaging import MODEL_SIDE, postprocess, preprocess


class Segmenter(Protocol):
    def segment(self, image: Image.Image) -> np.ndarray:
        """Return a uint8 mask (height, width) for an RGB image."""
        ...


def session_options(threads: int, memory_arena: bool):
    import onnxruntime as ort

    options = ort.SessionOptions()
    if threads > 0:
        options.intra_op_num_threads = threads
    options.enable_cpu_mem_arena = memory_arena
    return options


class OnnxSegmenter:
    """BiRefNet on ONNX Runtime CPU. The session is created on first use, not at startup."""

    def __init__(self, path: Path, threads: int = 0, side: int = MODEL_SIDE, memory_arena: bool = False) -> None:
        self.path = Path(path)
        self.threads = threads
        self.memory_arena = memory_arena
        self.side = side
        self._session = None
        self._lock = threading.Lock()

    @property
    def loaded(self) -> bool:
        return self._session is not None

    def _get_session(self):
        if self._session is None:
            with self._lock:
                if self._session is None:
                    import onnxruntime as ort

                    options = session_options(self.threads, self.memory_arena)
                    self._session = ort.InferenceSession(
                        str(self.path), sess_options=options, providers=["CPUExecutionProvider"]
                    )
        return self._session

    def segment(self, image: Image.Image) -> np.ndarray:
        session = self._get_session()
        tensor = preprocess(image, self.side)
        prediction = session.run(None, {session.get_inputs()[0].name: tensor})[0]
        return postprocess(prediction, image.size)
