from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from yaldatools_api.app import default_segmenters
from yaldatools_api.config import Settings
from yaldatools_api.models import MODELS, model_filename
from yaldatools_api.segmenter import OnnxSegmenter

from conftest import make_settings


class FakeInput:
    name = "input_image"


class RecordingSession:
    """Stands in for an ONNX Runtime session; records the tensor it receives."""

    def __init__(self) -> None:
        self.shapes: list[tuple[int, ...]] = []

    def get_inputs(self):
        return [FakeInput()]

    def run(self, _outputs, feeds):
        tensor = feeds["input_image"]
        self.shapes.append(tensor.shape)
        return [np.zeros((1, 1, tensor.shape[2], tensor.shape[3]), dtype=np.float32)]


def test_lite_side_defaults_to_1024():
    assert Settings().lite_side == 1024
    assert Settings.from_env({}).lite_side == 1024


@pytest.mark.parametrize("value", ["768", "512", "1024"])
def test_lite_side_is_read_from_the_environment(value):
    assert Settings.from_env({"YALDA_LITE_SIDE": value}).lite_side == int(value)


@pytest.mark.parametrize("value", ["640", "0", "2048", "abc", ""])
def test_invalid_lite_side_is_rejected(value):
    with pytest.raises(ValueError, match="YALDA_LITE_SIDE"):
        Settings.from_env({"YALDA_LITE_SIDE": value})


def lite_filename(side: int) -> str:
    return model_filename("lite", side)


def test_model_filename_per_side():
    assert model_filename("lite", 1024) == MODELS["lite"].filename
    assert model_filename("lite", 768) == "BiRefNet-lite-768.onnx"
    assert model_filename("lite", 512) == "BiRefNet-lite-512.onnx"
    assert model_filename("full", 1024) == MODELS["full"].filename
    assert model_filename("full", 768) == "BiRefNet-full-768.onnx"
    assert model_filename("full", 512) == "BiRefNet-full-512.onnx"


def test_full_side_defaults_to_1024():
    assert Settings().full_side == 1024
    assert Settings.from_env({}).full_side == 1024


@pytest.mark.parametrize("value", ["768", "512", "1024"])
def test_full_side_is_read_from_the_environment(value):
    assert Settings.from_env({"YALDA_FULL_SIDE": value}).full_side == int(value)


@pytest.mark.parametrize("value", ["640", "0", "abc", ""])
def test_invalid_full_side_is_rejected(value):
    with pytest.raises(ValueError, match="YALDA_FULL_SIDE"):
        Settings.from_env({"YALDA_FULL_SIDE": value})


@pytest.mark.parametrize("side", [1024, 768, 512])
def test_default_segmenters_pick_the_full_file_and_side(tmp_path: Path, side: int):
    for filename in {lite_filename(1024), model_filename("full", side)}:
        (tmp_path / filename).write_bytes(b"")

    segmenters = default_segmenters(make_settings(models_dir=tmp_path, full_side=side))

    assert segmenters["full"].path == tmp_path / model_filename("full", side)
    assert segmenters["full"].side == side
    assert segmenters["lite"].side == 1024  # the lite model is unaffected


def test_full_is_unavailable_when_the_selected_side_is_not_exported(tmp_path: Path):
    (tmp_path / MODELS["full"].filename).write_bytes(b"")

    segmenters = default_segmenters(make_settings(models_dir=tmp_path, full_side=512))

    assert "full" not in segmenters


@pytest.mark.parametrize("side", [1024, 768, 512])
def test_default_segmenters_pick_the_lite_file_and_side(tmp_path: Path, side: int):
    for filename in {lite_filename(1024), lite_filename(768), lite_filename(512), MODELS["full"].filename}:
        (tmp_path / filename).write_bytes(b"")

    segmenters = default_segmenters(make_settings(models_dir=tmp_path, lite_side=side))

    lite = segmenters["lite"]
    assert isinstance(lite, OnnxSegmenter)
    assert lite.path == tmp_path / lite_filename(side)
    assert lite.side == side
    assert segmenters["full"].side == 1024  # the full model is unaffected


def test_lite_is_unavailable_when_the_selected_side_is_not_exported(tmp_path: Path):
    (tmp_path / lite_filename(1024)).write_bytes(b"")

    segmenters = default_segmenters(make_settings(models_dir=tmp_path, lite_side=512))

    assert "lite" not in segmenters


@pytest.mark.parametrize("side", [768, 512])
def test_segment_preprocesses_at_the_segmenter_side(side: int):
    segmenter = OnnxSegmenter(Path("/unused.onnx"), side=side)
    session = RecordingSession()
    segmenter._session = session  # skip loading a real model

    mask = segmenter.segment(Image.new("RGB", (300, 200), (90, 20, 20)))

    assert session.shapes == [(1, 3, side, side)]
    assert mask.shape == (200, 300)
