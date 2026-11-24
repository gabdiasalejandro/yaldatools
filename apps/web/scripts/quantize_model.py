"""Quantize the ISNet general-use model to int8 for in-browser inference."""

import sys

from onnxruntime.quantization import QuantType, quantize_dynamic

source, target = sys.argv[1], sys.argv[2]
quantize_dynamic(source, target, weight_type=QuantType.QUInt8)
print(f"quantized {source} -> {target}")
