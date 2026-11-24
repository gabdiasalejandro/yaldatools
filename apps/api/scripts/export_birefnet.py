# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = [
#     "torch==2.5.1",
#     "torchvision==0.20.1",
#     "timm==1.0.11",
#     "einops==0.8.0",
#     "kornia==0.7.4",
#     "huggingface-hub==0.26.2",
#     "opencv-python-headless==4.10.0.84",
#     "onnx==1.17.0",
#     "onnxruntime==1.20.1",
#     "numpy==2.1.3",
#     "pillow==11.0.0",
#     "deform-conv2d-onnx-exporter==1.2.0",
# ]
#
# [[tool.uv.index]]
# name = "pytorch-cpu"
# url = "https://download.pytorch.org/whl/cpu"
# explicit = true
#
# [tool.uv.sources]
# torch = { index = "pytorch-cpu" }
# torchvision = { index = "pytorch-cpu" }
# ///
"""Export BiRefNet (general) lite (Swin-tiny) or full (Swin-large) to ONNX at smaller fixed sizes.

The rembg ONNX files of BiRefNet take a fixed 1x3x1024x1024 input, which keeps
~7 GB (lite) or ~9 GB (full) of RSS on CPU. Exporting the same weights at 768 or
512 px lowers that.

Sources (both MIT, https://github.com/ZhengPeng7/BiRefNet):
  - model code: the official repository at a pinned commit;
  - weights: release v1 `BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth` (lite) and
    `BiRefNet-general-epoch_244.pth` (full), the same checkpoints rembg ships as
    `BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx` and `BiRefNet-general-epoch_244.onnx`.

torchvision's `deform_conv2d` has no ONNX symbolic; it is registered with the
`deform_conv2d_onnx_exporter` package (MIT), as the official BiRefNet
`tutorials/BiRefNet_pth2onnx.ipynb` does, and exported with the TorchScript exporter.

Usage (downloads ~1 GB of CPU wheels once, plus 178 MB of lite or 885 MB of full weights):
    uv run apps/api/scripts/export_birefnet.py                    # lite at 768 and 512
    uv run apps/api/scripts/export_birefnet.py --model full --sides 512
    uv run apps/api/scripts/export_birefnet.py --sides 1024 --out /tmp/x   # control export

Outputs go to ~/.cache/yaldatools/models/BiRefNet-<model>-<side>.onnx (never the repository).
"""

from __future__ import annotations

import argparse
import hashlib
import os
import sys
import tarfile
import urllib.request
from pathlib import Path

CACHE = Path.home() / ".cache" / "yaldatools"
MODELS_DIR = CACHE / "models"
REPO_COMMIT = "f7079632d681ecf12161fcea8905682934e59e51"
REPO_TARBALL = f"https://github.com/ZhengPeng7/BiRefNet/archive/{REPO_COMMIT}.tar.gz"
RELEASE_URL = "https://github.com/ZhengPeng7/BiRefNet/releases/download/v1"
# model -> (weights file, sha256, backbone, lateral channels of that backbone)
VARIANTS = {
    "lite": (
        "BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth",
        "6a1e050c6ec2697e5ed268455df544782b023acf8643ab771250979094875ab1",
        "swin_v1_t",
        [768, 384, 192, 96],
    ),
    "full": (
        "BiRefNet-general-epoch_244.pth",
        "11341a6a1c12646627e8d28da025bfec8aad027929d377cbe8fd4759636cc77c",
        "swin_v1_l",
        [1536, 768, 384, 192],
    ),
}
OPSET = 17


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def download(url: str, path: Path) -> Path:
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        partial = path.with_name(path.name + ".part")
        print(f"Downloading {url} ...", flush=True)
        urllib.request.urlretrieve(url, partial)
        partial.rename(path)
    return path


def fetch_weights(variant: str) -> Path:
    name, expected, _, _ = VARIANTS[variant]
    path = download(f"{RELEASE_URL}/{name}", CACHE / "weights" / name)
    if (digest := sha256_of(path)) != expected:
        raise SystemExit(f"sha256 mismatch for {path}: {digest}")
    return path


def fetch_source() -> Path:
    root = CACHE / "birefnet-src"
    source = root / f"BiRefNet-{REPO_COMMIT}"
    if not source.exists():
        tarball = download(REPO_TARBALL, root / f"{REPO_COMMIT}.tar.gz")
        with tarfile.open(tarball) as archive:
            archive.extractall(root, filter="data")
    return source


def load_model(source: Path, weights: Path, variant: str):
    """Build the official BiRefNet with the variant's backbone and load the checkpoint strictly."""
    import torch

    os.chdir(source)  # config.py lists the working directory
    sys.path.insert(0, str(source))
    import config as birefnet_config

    original_init = birefnet_config.Config.__init__
    _, _, backbone, lateral = VARIANTS[variant]

    def variant_init(self) -> None:
        original_init(self)
        self.bb = backbone
        self.SDPA_enabled = False  # plain attention, as the checkpoints' original code
        channels = list(lateral)
        if self.mul_scl_ipt == "cat":
            channels = [channel * 2 for channel in channels]
        self.lateral_channels_in_collection = channels
        self.cxt = channels[1:][::-1][-self.cxt_num:] if self.cxt_num else []

    birefnet_config.Config.__init__ = variant_init

    from models.birefnet import BiRefNet
    from utils import check_state_dict

    model = BiRefNet(bb_pretrained=False)
    state = check_state_dict(torch.load(weights, map_location="cpu", weights_only=True))
    model.load_state_dict(state, strict=True)
    return model.eval()


def register_deform_conv2d() -> None:
    """Register the deform_conv2d symbolic, with the official notebook's shape fallback.

    Inside BiRefNet the tracer loses some static sizes; the notebook recovers them from
    the (contiguous NCHW) strides. The numeric check in `export` guards the result.
    """
    import deform_conv2d_onnx_exporter as exporter

    original = exporter.get_tensor_dim_size

    def dim_size(tensor, dim):
        size = original(tensor, dim)
        if size is None and dim in (0, 2, 3):
            strides = tensor.type().strides()
            size = {0: strides[3], 2: strides[1] // strides[2], 3: strides[2]}[dim]
        return size

    exporter.get_tensor_dim_size = dim_size
    exporter.register_deform_conv2d_onnx_op()


def export(model, side: int, path: Path) -> None:
    import numpy as np
    import onnxruntime as ort
    import torch

    sample = torch.randn(1, 3, side, side)
    partial = path.with_name(path.name + ".part")
    path.parent.mkdir(parents=True, exist_ok=True)
    with torch.no_grad():
        torch.onnx.export(
            model,
            sample,
            str(partial),
            opset_version=OPSET,
            input_names=["input_image"],
            output_names=["output_image"],
            dynamo=False,
        )
        expected = model(sample)[-1].numpy()
    session = ort.InferenceSession(str(partial), providers=["CPUExecutionProvider"])
    actual = session.run(None, {"input_image": sample.numpy()})[0]
    error = float(np.abs(1 / (1 + np.exp(-actual)) - 1 / (1 + np.exp(-expected))).max())
    print(f"  {side}px: max |sigmoid(onnx) - sigmoid(torch)| = {error:.2e}", flush=True)
    if error > 1e-2:
        partial.unlink()
        raise SystemExit(f"ONNX output diverges from PyTorch at {side}px")
    partial.rename(path)
    print(f"  wrote {path} ({path.stat().st_size / 1e6:.0f} MB)", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--model", choices=sorted(VARIANTS), default="lite", help="model to export (default: lite)")
    parser.add_argument("--sides", default="768,512", help="comma-separated input sides (default: 768,512)")
    parser.add_argument("--out", type=Path, default=MODELS_DIR, help=f"output folder (default: {MODELS_DIR})")
    args = parser.parse_args()
    sides = [int(side) for side in args.sides.split(",") if side.strip()]
    if any(side <= 0 or side % 32 for side in sides):
        raise SystemExit("Each side must be a positive multiple of 32")
    out = args.out.expanduser().resolve()

    import torch

    torch.set_num_threads(os.cpu_count() or 1)
    weights = fetch_weights(args.model)
    model = load_model(fetch_source(), weights, args.model)
    register_deform_conv2d()
    for side in sides:
        print(f"Exporting {side}x{side} ...", flush=True)
        export(model, side, out / f"BiRefNet-{args.model}-{side}.onnx")


if __name__ == "__main__":
    main()
