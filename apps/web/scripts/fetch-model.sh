#!/usr/bin/env bash
# Downloads the ISNet general-use model (Apache-2.0, xuebinqin/DIS, exported by rembg)
# and quantizes it to int8 into public/models/. The model is not committed to git.
set -euo pipefail

URL="https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
WEB_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$WEB_DIR/public/models/isnet-general-use-q8.onnx"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$(dirname "$OUT")"
echo "Downloading $URL"
curl -fL --retry 3 -o "$WORK/isnet.onnx" "$URL"
sha256sum "$WORK/isnet.onnx"
uv run --no-project --python 3.12 --with onnxruntime --with onnx \
  python "$WEB_DIR/scripts/quantize_model.py" "$WORK/isnet.onnx" "$OUT"
ls -lh "$OUT"
