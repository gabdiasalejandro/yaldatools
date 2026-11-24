#!/usr/bin/env bash
# Downloads the browser models into public/models/ (not committed to git):
# ISNet general-use (Apache-2.0, xuebinqin/DIS, exported by rembg), quantized here to int8,
# and SlimSAM (Apache-2.0) for tap-to-select.
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

# SlimSAM (Apache-2.0, Xenova/slimsam-77-uniform) for tap-to-select, int8 builds.
SAM_URL="https://huggingface.co/Xenova/slimsam-77-uniform/resolve/main/onnx"
SAM_DIR="$WEB_DIR/public/models/slimsam"
mkdir -p "$SAM_DIR"
for file in vision_encoder_quantized.onnx prompt_encoder_mask_decoder_quantized.onnx; do
  echo "Downloading $SAM_URL/$file"
  curl -fL --retry 3 -o "$SAM_DIR/$file" "$SAM_URL/$file"
done
ls -lh "$SAM_DIR"
