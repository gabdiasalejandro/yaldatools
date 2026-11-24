# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["onnxruntime>=1.20", "numpy>=2", "pillow>=11"]
# ///
"""Compare background-removal models on CPU, side by side.

Runs each model over a folder of photos and writes an HTML report with the
cut-outs, the inference time and the "doubtful area" (the same metric the web
uses to call an image hard). Models are downloaded once to a local cache.

Usage:
    uv run apps/api/scripts/compare_models.py --images ~/fotos --out /tmp/compare
    uv run apps/api/scripts/compare_models.py --images ~/fotos --out /tmp/compare --models isnet-q8,birefnet-lite
    uv run apps/api/scripts/compare_models.py --images ~/fotos --out /tmp/compare \
        --models birefnet-lite,birefnet-lite-768,birefnet-lite-512
"""

from __future__ import annotations

import argparse
import hashlib
import html
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[3]
CACHE = Path.home() / ".cache" / "yaldatools" / "models"
REMBG = "https://github.com/danielgatis/rembg/releases/download/v0.0.0"
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)

# Same limits and thresholds as the web (apps/web/app/features/bg-remover).
MAX_SIDE = 2048
DOUBT_LOW, DOUBT_HIGH = 25, 230
DOUBTFUL_THRESHOLD = 0.15


@dataclass(frozen=True)
class ModelSpec:
    name: str
    description: str
    mean: tuple[float, float, float]
    std: tuple[float, float, float]
    source: str  # local path inside the repo, a URL to download, or "cache:<file>" already in the cache
    side: int = 1024


MODELS = {
    "isnet-q8": ModelSpec(
        "isnet-q8",
        "ISNet general, int8 (the browser model)",
        (0.5, 0.5, 0.5),
        (1.0, 1.0, 1.0),
        "apps/web/public/models/isnet-general-use-q8.onnx",
    ),
    "birefnet-lite": ModelSpec(
        "birefnet-lite",
        "BiRefNet general lite (Swin tiny), fp32, 224 MB",
        IMAGENET_MEAN,
        IMAGENET_STD,
        f"{REMBG}/BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx",
    ),
    "birefnet": ModelSpec(
        "birefnet",
        "BiRefNet general, fp32, 973 MB",
        IMAGENET_MEAN,
        IMAGENET_STD,
        f"{REMBG}/BiRefNet-general-epoch_244.onnx",
    ),
    # Re-exports of the lite weights at smaller inputs (scripts/export_birefnet.py).
    "birefnet-lite-768": ModelSpec(
        "birefnet-lite-768",
        "BiRefNet general lite (Swin tiny), fp32, 768 px input",
        IMAGENET_MEAN,
        IMAGENET_STD,
        "cache:BiRefNet-lite-768.onnx",
        side=768,
    ),
    "birefnet-lite-512": ModelSpec(
        "birefnet-lite-512",
        "BiRefNet general lite (Swin tiny), fp32, 512 px input",
        IMAGENET_MEAN,
        IMAGENET_STD,
        "cache:BiRefNet-lite-512.onnx",
        side=512,
    ),
}
DEFAULT_MODELS = ("isnet-q8", "birefnet-lite", "birefnet")


def model_path(spec: ModelSpec) -> Path:
    if spec.source.startswith("cache:"):
        path = CACHE / spec.source.removeprefix("cache:")
        if not path.exists():
            raise SystemExit(f"{path} is missing: run `uv run apps/api/scripts/export_birefnet.py` first.")
        return path
    if not spec.source.startswith("http"):
        path = REPO / spec.source
        if not path.exists():
            raise SystemExit(f"{path} is missing: run `pnpm fetch-model` in apps/web first.")
        return path
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / spec.source.rsplit("/", 1)[1]
    if not path.exists():
        print(f"Downloading {spec.name} ({spec.source}) ...", flush=True)
        partial = path.with_suffix(".part")
        urllib.request.urlretrieve(spec.source, partial)
        partial.rename(path)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        print(f"  sha256 {digest}", flush=True)
    return path


def fit_within(image: Image.Image) -> Image.Image:
    scale = min(1.0, MAX_SIDE / max(image.size))
    if scale == 1.0:
        return image
    return image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)


def preprocess(image: Image.Image, spec: ModelSpec) -> np.ndarray:
    """rembg's normalization: divide by the brightest value, then mean/std."""
    resized = np.asarray(image.resize((spec.side, spec.side), Image.LANCZOS), dtype=np.float32)
    resized = resized / max(float(resized.max()), 1e-6)
    channels = [(resized[:, :, c] - spec.mean[c]) / spec.std[c] for c in range(3)]
    return np.stack(channels)[None].astype(np.float32)


def postprocess(prediction: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    pred = prediction[0, 0].astype(np.float32)
    if pred.min() < 0 or pred.max() > 1:  # raw logits: apply the sigmoid
        pred = 1 / (1 + np.exp(-pred))
    low, high = float(pred.min()), float(pred.max())
    pred = (pred - low) / (high - low) if high - low > 1e-6 else np.zeros_like(pred)
    mask = Image.fromarray((pred * 255).round().astype(np.uint8)).resize(size, Image.BILINEAR)
    return np.asarray(mask)


def doubtful_ratio(alpha: np.ndarray) -> float:
    visible = alpha > DOUBT_LOW
    doubtful = visible & (alpha < DOUBT_HIGH)
    return float(doubtful.sum() / visible.sum()) if visible.any() else 1.0


def checkerboard(size: tuple[int, int], square: int = 16) -> Image.Image:
    width, height = size
    yy, xx = np.mgrid[0:height, 0:width]
    tiles = ((xx // square + yy // square) % 2).astype(bool)
    board = np.where(tiles[..., None], 208, 255).astype(np.uint8).repeat(3, axis=2)
    return Image.fromarray(board, "RGB")


def cutout_preview(image: Image.Image, alpha: np.ndarray) -> Image.Image:
    rgba = image.copy()
    rgba.putalpha(Image.fromarray(alpha))
    board = checkerboard(image.size)
    board.paste(rgba, (0, 0), rgba)
    return board


def side_by_side(panels: list[tuple[str, Image.Image]], height: int = 360) -> Image.Image:
    scaled = [(label, panel.resize((round(panel.width * height / panel.height), height))) for label, panel in panels]
    width = sum(panel.width for _, panel in scaled) + 8 * (len(scaled) + 1)
    sheet = Image.new("RGB", (width, height + 40), (192, 192, 192))
    draw = ImageDraw.Draw(sheet)
    x = 8
    for label, panel in scaled:
        sheet.paste(panel, (x, 32))
        draw.text((x, 10), label, fill=(0, 0, 128))
        x += panel.width + 8
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--images", type=Path, required=True, help="folder with JPG, PNG or WebP photos")
    parser.add_argument("--out", type=Path, required=True, help="folder for the report (created if missing)")
    parser.add_argument(
        "--models", default=",".join(DEFAULT_MODELS), help=f"comma-separated, from: {', '.join(MODELS)}"
    )
    args = parser.parse_args()

    names = [name.strip() for name in args.models.split(",") if name.strip()]
    unknown = [name for name in names if name not in MODELS]
    if unknown:
        raise SystemExit(f"Unknown models: {', '.join(unknown)}")
    photos = sorted(p for p in args.images.expanduser().iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if not photos:
        raise SystemExit(f"No JPG, PNG or WebP files in {args.images}")
    args.out.mkdir(parents=True, exist_ok=True)

    sessions: dict[str, ort.InferenceSession] = {}
    load_seconds: dict[str, float] = {}
    for name in names:
        started = time.perf_counter()
        sessions[name] = ort.InferenceSession(str(model_path(MODELS[name])), providers=["CPUExecutionProvider"])
        load_seconds[name] = time.perf_counter() - started
        print(f"Loaded {name} in {load_seconds[name]:.1f} s", flush=True)

    rows: list[dict] = []
    for photo in photos:
        image = fit_within(Image.open(photo).convert("RGB"))
        panels: list[tuple[str, Image.Image]] = [("original", image)]
        for name in names:
            spec, session = MODELS[name], sessions[name]
            tensor = preprocess(image, spec)
            started = time.perf_counter()
            prediction = session.run(None, {session.get_inputs()[0].name: tensor})[0]
            seconds = time.perf_counter() - started
            alpha = postprocess(prediction, image.size)
            doubtful = doubtful_ratio(alpha)
            Image.fromarray(alpha).save(args.out / f"{photo.stem}.{name}.mask.png")
            panels.append((f"{name}  {seconds:.1f}s  dudosa {doubtful:.0%}", cutout_preview(image, alpha)))
            rows.append({"photo": photo.name, "model": name, "seconds": seconds, "doubtful": doubtful})
            print(f"{photo.name:30} {name:14} {seconds:6.2f} s  doubtful {doubtful:6.1%}", flush=True)
        side_by_side(panels).save(args.out / f"{photo.stem}.compare.png")

    write_report(args.out, photos, names, rows, load_seconds)
    print(f"\nReport: {args.out / 'index.html'}")


def write_report(out: Path, photos: list[Path], names: list[str], rows: list[dict], load_seconds: dict[str, float]) -> None:
    def summary(name: str) -> str:
        own = [row for row in rows if row["model"] == name]
        mean_time = sum(row["seconds"] for row in own) / len(own)
        hard = sum(row["doubtful"] > DOUBTFUL_THRESHOLD for row in own)
        return (
            f"<tr><td>{html.escape(MODELS[name].description)}</td><td>{load_seconds[name]:.1f} s</td>"
            f"<td>{mean_time:.2f} s</td><td>{hard} / {len(own)}</td></tr>"
        )

    figures = "\n".join(
        f'<figure><figcaption>{html.escape(photo.name)}</figcaption><img src="{html.escape(photo.stem)}.compare.png" alt=""></figure>'
        for photo in photos
    )
    csv = "photo,model,seconds,doubtful\n" + "\n".join(
        f"{row['photo']},{row['model']},{row['seconds']:.3f},{row['doubtful']:.4f}" for row in rows
    )
    (out / "results.csv").write_text(csv + "\n")
    (out / "index.html").write_text(f"""<!doctype html>
<html lang="es"><meta charset="utf-8"><title>Comparación de modelos</title>
<style>body{{font:14px Tahoma,Verdana,sans-serif;background:#c0c0c0;margin:20px}}table{{border-collapse:collapse;background:#fff}}
td,th{{border:1px solid #808080;padding:4px 8px;text-align:left}}figure{{margin:16px 0}}img{{max-width:100%}}</style>
<h1>Comparación de modelos (CPU)</h1>
<p>Zona dudosa: píxeles semitransparentes dentro del sujeto. Por encima del {DOUBTFUL_THRESHOLD:.0%} la web la llama difícil.</p>
<table><tr><th>Modelo</th><th>Carga</th><th>Tiempo medio por imagen</th><th>Difíciles</th></tr>
{''.join(summary(name) for name in names)}</table>
{figures}
</html>
""")


if __name__ == "__main__":
    main()
