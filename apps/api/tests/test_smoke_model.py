from __future__ import annotations

import time

import numpy as np
import pytest
from PIL import Image, ImageDraw

from yaldatools_api.config import Settings
from yaldatools_api.models import MODELS, model_filename
from yaldatools_api.segmenter import OnnxSegmenter


@pytest.mark.slow
def test_real_lite_model_segments_a_synthetic_image():
    settings = Settings.from_env()
    path = settings.models_dir / MODELS["lite"].filename
    if not path.exists():
        pytest.skip(f"{path} is not cached")

    image = Image.new("RGB", (320, 240), (235, 235, 235))
    ImageDraw.Draw(image).ellipse((100, 50, 220, 190), fill=(200, 30, 30))
    segmenter = OnnxSegmenter(path, threads=settings.threads)

    started = time.perf_counter()
    mask = segmenter.segment(image)
    seconds = time.perf_counter() - started
    print(f"\nreal lite model (load + first run): {seconds:.2f} s")

    assert mask.shape == (240, 320) and mask.dtype == np.uint8
    assert mask[120, 160] > mask[10, 10]  # the disc is more foreground than the corner


@pytest.mark.slow
@pytest.mark.parametrize("side", [768, 512])
def test_real_exported_lite_model_segments_a_synthetic_image(side):
    path = Settings.from_env().models_dir / model_filename("lite", side)
    if not path.exists():
        pytest.skip(f"{path} is not exported (scripts/export_birefnet.py)")

    image = Image.new("RGB", (320, 240), (235, 235, 235))
    ImageDraw.Draw(image).ellipse((100, 50, 220, 190), fill=(200, 30, 30))
    mask = OnnxSegmenter(path, side=side).segment(image)

    assert mask.shape == (240, 320) and mask.dtype == np.uint8
    assert mask[120, 160] > mask[10, 10]
