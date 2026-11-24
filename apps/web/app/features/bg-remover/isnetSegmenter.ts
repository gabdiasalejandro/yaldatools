// ONNX Runtime adapter for the Segmenter port. Runs only in the browser (worker).
import * as ort from "onnxruntime-web/wasm";
import wasmMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { MODEL_SIDE } from "./model";
import type { Segmenter } from "./pipeline";

/** Downloads the model reporting progress (0–1); the browser cache serves later visits. */
async function fetchModel(url: string, onProgress: (fraction: number) => void): Promise<Uint8Array> {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Model request failed: ${response.status}`);
  const total = Number(response.headers.get("Content-Length")) || 0;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) onProgress(Math.min(1, received / total));
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function createIsnetSegmenter(
  modelUrl: string,
  onProgress: (fraction: number) => void,
): Promise<Segmenter> {
  ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmMjsUrl };
  // Threads need cross-origin isolation (COOP/COEP headers); otherwise run on one.
  ort.env.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

  const model = await fetchModel(modelUrl, onProgress);
  // The int8 model uses ConvInteger, which only the WASM (CPU) backend supports.
  const session = await ort.InferenceSession.create(model, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  return {
    async segment(input) {
      const tensor = new ort.Tensor("float32", input, [1, 3, MODEL_SIDE, MODEL_SIDE]);
      const results = await session.run({ [inputName]: tensor }, [outputName]);
      return results[outputName].data as Float32Array;
    },
  };
}
