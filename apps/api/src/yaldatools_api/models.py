"""BiRefNet model catalog and an optional downloader.

    uv run python -m yaldatools_api.models          # fetch lite and full
    uv run python -m yaldatools_api.models lite     # fetch only lite
"""

from __future__ import annotations

import hashlib
import sys
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from .config import Settings

REMBG = "https://github.com/danielgatis/rembg/releases/download/v0.0.0"


@dataclass(frozen=True)
class ModelSpec:
    key: str  # query value: lite | full
    label: str  # X-Model header value
    filename: str
    sha256: str

    @property
    def url(self) -> str:
        return f"{REMBG}/{self.filename}"


MODELS: dict[str, ModelSpec] = {
    "lite": ModelSpec(
        "lite",
        "birefnet-lite",
        "BiRefNet-general-bb_swin_v1_tiny-epoch_232.onnx",
        "5600024376f572a557870a5eb0afb1e5961636bef4e1e22132025467d0f03333",
    ),
    "full": ModelSpec(
        "full",
        "birefnet",
        "BiRefNet-general-epoch_244.onnx",
        "58f621f00f5d756097615970a88a791584600dcf7c45b18a0a6267535a1ebd3c",
    ),
}


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def fetch(spec: ModelSpec, models_dir: Path) -> Path:
    models_dir.mkdir(parents=True, exist_ok=True)
    path = models_dir / spec.filename
    if path.exists():
        return path
    partial = path.with_suffix(".part")
    print(f"Downloading {spec.label} from {spec.url} ...", flush=True)
    urllib.request.urlretrieve(spec.url, partial)
    if (digest := sha256_of(partial)) != spec.sha256:
        partial.unlink()
        raise SystemExit(f"sha256 mismatch for {spec.filename}: {digest}")
    partial.rename(path)
    return path


def main(argv: list[str]) -> None:
    settings = Settings.from_env()
    keys = argv or list(MODELS)
    for key in keys:
        if key not in MODELS:
            raise SystemExit(f"Unknown model {key!r}; choose from {', '.join(MODELS)}")
        print(fetch(MODELS[key], settings.models_dir))


if __name__ == "__main__":
    main(sys.argv[1:])
