// Shared ONNX Runtime setup for the browser models (ISNet and SlimSAM). Worker only.
import * as ort from "onnxruntime-web/wasm";
import wasmMjsUrl from "onnxruntime-web/ort-wasm-simd-threaded.mjs?url";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: wasmMjsUrl };
// Threads need cross-origin isolation (COOP/COEP headers); otherwise run on one.
ort.env.wasm.numThreads = globalThis.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;

export { ort };

/** Downloads a model reporting progress (0–1); the browser cache serves later visits. */
export async function fetchModel(url: string, onProgress: (fraction: number) => void = () => {}): Promise<Uint8Array> {
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

/** The int8 models use integer ops that only the WASM (CPU) backend supports. */
export async function createSession(model: Uint8Array): Promise<ort.InferenceSession> {
  return ort.InferenceSession.create(model, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
}
