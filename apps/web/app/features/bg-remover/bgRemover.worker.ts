/// <reference lib="webworker" />
// Runs the whole pipeline off the main thread so the page stays responsive.
import { createIsnetSegmenter } from "./isnetSegmenter";
import { removeBackground, type Segmenter } from "./pipeline";
import type { WorkerMessage, WorkerRequest } from "./worker-protocol";

declare const self: DedicatedWorkerGlobalScope;

// The model is loaded once and reused for the next images.
let segmenter: Promise<Segmenter> | null = null;

class ModelUnavailable extends Error {}

function post(message: WorkerMessage, transfer: Transferable[] = []) {
  self.postMessage(message, transfer);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, width, height, pixels, modelUrl } = event.data;
  const started = performance.now();
  const loadModel = () => {
    segmenter ??= createIsnetSegmenter(modelUrl, (progress) =>
      post({ type: "stage", id, stage: "loadingModel", progress }),
    ).catch((error: unknown) => {
      segmenter = null;
      throw new ModelUnavailable(String(error));
    });
    return segmenter;
  };

  try {
    const image = { width, height, data: new Uint8ClampedArray(pixels) };
    const result = await removeBackground(image, loadModel, (stage) => post({ type: "stage", id, stage }));
    const alpha = result.alpha.buffer as ArrayBuffer;
    post(
      {
        type: "done",
        id,
        result: { ...result, alpha, milliseconds: Math.round(performance.now() - started) },
      },
      [alpha],
    );
  } catch (error) {
    console.error(error);
    post({ type: "error", id, reason: error instanceof ModelUnavailable ? "modelUnavailable" : "failed" });
  }
};
