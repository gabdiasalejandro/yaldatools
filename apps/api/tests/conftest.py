from __future__ import annotations

import io
import threading

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from yaldatools_api.app import create_app
from yaldatools_api.config import Settings


class FakeSegmenter:
    """Returns a constant mask of the input size; counts calls."""

    def __init__(self) -> None:
        self.calls = 0

    def segment(self, image: Image.Image) -> np.ndarray:
        self.calls += 1
        return np.full((image.height, image.width), 200, dtype=np.uint8)


class BlockingSegmenter(FakeSegmenter):
    """Blocks inside segment() until released, to hold a queue slot."""

    def __init__(self) -> None:
        super().__init__()
        self.entered = threading.Event()
        self.release = threading.Event()

    def segment(self, image: Image.Image) -> np.ndarray:
        self.entered.set()
        self.release.wait(timeout=10)
        return super().segment(image)


def encode(size: tuple[int, int], fmt: str = "JPEG", color=(180, 40, 40)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format=fmt)
    return buffer.getvalue()


def make_settings(**overrides) -> Settings:
    values = {"models_dir": "/nonexistent", "enable_full": True, "concurrency": 1, "max_waiting": 4, "threads": 0}
    values.update(overrides)
    return Settings(**values)


@pytest.fixture
def fakes() -> dict[str, FakeSegmenter]:
    return {"lite": FakeSegmenter(), "full": FakeSegmenter()}


@pytest.fixture
def client(fakes):
    with TestClient(create_app(make_settings(), fakes)) as test_client:
        yield test_client
