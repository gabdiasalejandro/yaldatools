"""Decoding, validation and BiRefNet pre/post-processing (single source of truth)."""

from __future__ import annotations

import io
import warnings

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

# Same limits as the web (apps/web/app/features/bg-remover).
MAX_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_SIDE = 2048
MAX_PIXELS = 50_000_000  # ~7000 x 7000; bigger headers are rejected before decoding
Image.MAX_IMAGE_PIXELS = MAX_PIXELS

ACCEPTED_CONTENT_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
ACCEPTED_FORMATS = ("JPEG", "PNG", "WEBP")

MODEL_SIDE = 1024
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


class InvalidImage(ValueError):
    """The bytes are not a decodable image (-> 422)."""


class UnsupportedFormat(ValueError):
    """A real image, but not JPEG, PNG or WebP (-> 415)."""


def sniff_format(data: bytes) -> str | None:
    if data.startswith(b"\xff\xd8\xff"):
        return "JPEG"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "PNG"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "WEBP"
    return None


def decode(data: bytes) -> Image.Image:
    """Decode JPEG/PNG/WebP bytes to an upright RGB image, whatever the Content-Type claimed."""
    fmt = sniff_format(data)
    if fmt is None:
        try:
            Image.open(io.BytesIO(data))  # header only: is it some other image format?
        except Exception as error:
            raise InvalidImage("not an image") from error
        raise UnsupportedFormat("only JPEG, PNG and WebP are accepted")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(data), formats=[fmt])
            if image.width * image.height > MAX_PIXELS:
                raise InvalidImage("image is too large")
            image.load()
            image = ImageOps.exif_transpose(image)  # browsers honour EXIF orientation too
            return image.convert("RGB")
    except InvalidImage:
        raise
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError, Image.DecompressionBombError,
            Image.DecompressionBombWarning) as error:
        raise InvalidImage("undecodable image") from error


def fit_within(image: Image.Image, max_side: int = MAX_SIDE) -> Image.Image:
    scale = min(1.0, max_side / max(image.size))
    if scale == 1.0:
        return image
    # Very elongated images would round their short side to 0 px.
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.LANCZOS)


def preprocess(image: Image.Image, side: int = MODEL_SIDE) -> np.ndarray:
    """rembg's normalization: divide by the brightest value, then ImageNet mean/std. Returns NCHW."""
    resized = np.asarray(image.convert("RGB").resize((side, side), Image.LANCZOS), dtype=np.float32)
    resized = resized / max(float(resized.max()), 1e-6)
    channels = [(resized[:, :, c] - IMAGENET_MEAN[c]) / IMAGENET_STD[c] for c in range(3)]
    return np.stack(channels)[None].astype(np.float32)


def postprocess(prediction: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    """Model output (1, 1, H, W) -> uint8 mask of `size` (width, height)."""
    pred = prediction[0, 0].astype(np.float32)
    if pred.min() < 0 or pred.max() > 1:  # raw logits: apply the sigmoid
        pred = 1 / (1 + np.exp(-pred))
    low, high = float(pred.min()), float(pred.max())
    pred = (pred - low) / (high - low) if high - low > 1e-6 else np.zeros_like(pred)
    mask = Image.fromarray((pred * 255).round().astype(np.uint8)).resize(size, Image.BILINEAR)
    return np.asarray(mask)


def encode_mask_png(mask: np.ndarray) -> bytes:
    buffer = io.BytesIO()
    Image.fromarray(mask, mode="L").save(buffer, format="PNG")
    return buffer.getvalue()
