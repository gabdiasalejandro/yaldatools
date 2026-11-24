/// <reference lib="webworker" />
// Tap-to-select: computes the SlimSAM image embedding once per image, then
// decodes a mask for every set of points the user taps.
import { createSession, fetchModel, ort } from "./onnxRuntime";
import { resizeRaster } from "./pipeline";
import { SAM_SIDE, bestMaskIndex, samLogitsToAlpha, samResizeSize, scalePoints, toSamPixels, type SamPoint } from "./sam";

declare const self: DedicatedWorkerGlobalScope;

export type SamRequest =
  | { type: "embed"; id: number; width: number; height: number; pixels: ArrayBuffer; modelBase: string }
  | { type: "decode"; id: number; points: SamPoint[] };

export type SamMessage =
  | { type: "progress"; id: number; stage: "loadingModel" | "embedding"; progress?: number }
  | { type: "ready"; id: number }
  | { type: "mask"; id: number; alpha: ArrayBuffer }
  | { type: "error"; id: number };

type Sessions = { encoder: ort.InferenceSession; decoder: ort.InferenceSession };
type Embedding = {
  id: number;
  width: number;
  height: number;
  resized: { width: number; height: number };
  feeds: Record<string, ort.Tensor>;
};

let sessions: Promise<Sessions> | null = null;
let embedding: Embedding | null = null;

function post(message: SamMessage, transfer: Transferable[] = []) {
  self.postMessage(message, transfer);
}

function loadSessions(modelBase: string, id: number): Promise<Sessions> {
  sessions ??= (async () => {
    const report = (offset: number) => (fraction: number) =>
      post({ type: "progress", id, stage: "loadingModel", progress: offset + fraction / 2 });
    const encoder = await createSession(await fetchModel(`${modelBase}/vision_encoder_quantized.onnx`, report(0)));
    const decoder = await createSession(
      await fetchModel(`${modelBase}/prompt_encoder_mask_decoder_quantized.onnx`, report(0.5)),
    );
    return { encoder, decoder };
  })().catch((error: unknown) => {
    sessions = null;
    throw error;
  });
  return sessions;
}

async function embed(request: Extract<SamRequest, { type: "embed" }>) {
  const { encoder } = await loadSessions(request.modelBase, request.id);
  post({ type: "progress", id: request.id, stage: "embedding" });
  const image = { width: request.width, height: request.height, data: new Uint8ClampedArray(request.pixels) };
  const resized = samResizeSize(image.width, image.height);
  const pixels = toSamPixels(resizeRaster(image, resized.width, resized.height));
  const outputs = await encoder.run({ pixel_values: new ort.Tensor("float32", pixels, [1, 3, SAM_SIDE, SAM_SIDE]) });
  embedding = {
    id: request.id,
    width: image.width,
    height: image.height,
    resized,
    feeds: {
      image_embeddings: outputs.image_embeddings,
      image_positional_embeddings: outputs.image_positional_embeddings,
    },
  };
  post({ type: "ready", id: request.id });
}

async function decode(request: Extract<SamRequest, { type: "decode" }>) {
  if (!embedding || embedding.id !== request.id || !sessions) throw new Error("No embedding for this image");
  const { decoder } = await sessions;
  const { coords, labels } = scalePoints(
    request.points,
    embedding.width,
    embedding.height,
    embedding.resized.width,
    embedding.resized.height,
  );
  const count = request.points.length;
  const outputs = await decoder.run({
    ...embedding.feeds,
    input_points: new ort.Tensor("float32", Float32Array.from(coords), [1, 1, count, 2]),
    input_labels: new ort.Tensor("int64", BigInt64Array.from(labels.map(BigInt)), [1, 1, count]),
  });
  const index = bestMaskIndex(outputs.iou_scores.data as Float32Array);
  const alpha = samLogitsToAlpha(
    outputs.pred_masks.data as Float32Array,
    index,
    embedding.resized.width,
    embedding.resized.height,
    embedding.width,
    embedding.height,
  );
  post({ type: "mask", id: request.id, alpha: alpha.buffer as ArrayBuffer }, [alpha.buffer as ArrayBuffer]);
}

self.onmessage = async (event: MessageEvent<SamRequest>) => {
  try {
    if (event.data.type === "embed") await embed(event.data);
    else await decode(event.data);
  } catch (error) {
    console.error(error);
    post({ type: "error", id: event.data.id });
  }
};
