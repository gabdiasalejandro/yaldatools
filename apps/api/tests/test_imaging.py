from __future__ import annotations

import numpy as np
import pytest
from PIL import Image

from yaldatools_api.imaging import (
    IMAGENET_MEAN,
    IMAGENET_STD,
    MODEL_SIDE,
    fit_within,
    postprocess,
    preprocess,
)


@pytest.mark.parametrize("value", [255, 128])
def test_preprocess_shape_and_rembg_normalization(value):
    tensor = preprocess(Image.new("RGB", (300, 200), (value, value, value)))

    assert tensor.shape == (1, 3, MODEL_SIDE, MODEL_SIDE)
    assert tensor.dtype == np.float32
    # Divided by the brightest value (so any flat image becomes 1.0), then ImageNet mean/std.
    for channel in range(3):
        expected = (1.0 - IMAGENET_MEAN[channel]) / IMAGENET_STD[channel]
        assert np.allclose(tensor[0, channel], expected, atol=1e-5)


def test_postprocess_keeps_probabilities_without_sigmoid():
    mask = postprocess(np.array([[[[0.0, 0.25, 1.0]]]], dtype=np.float32), (3, 1))
    assert mask.dtype == np.uint8
    assert mask.shape == (1, 3)
    assert mask.tolist() == [[0, 64, 255]]


def test_postprocess_applies_sigmoid_to_logits():
    # sigmoid(-4, 0, 1) min-max normalized -> 0, 0.676, 1; without sigmoid it would be 0, 0.8, 1.
    mask = postprocess(np.array([[[[-4.0, 0.0, 1.0]]]], dtype=np.float32), (3, 1))
    assert mask.tolist() == [[0, 172, 255]]


def test_postprocess_flat_prediction_is_empty_and_resized():
    mask = postprocess(np.full((1, 1, 8, 8), 0.5, dtype=np.float32), (20, 10))
    assert mask.shape == (10, 20)
    assert not mask.any()


def test_fit_within_downscales_longest_side():
    assert fit_within(Image.new("RGB", (4096, 1000))).size == (2048, 500)
    assert fit_within(Image.new("RGB", (1000, 4096))).size == (500, 2048)
    small = Image.new("RGB", (100, 50))
    assert fit_within(small) is small
