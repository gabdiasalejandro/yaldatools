import { useCallback, useEffect, useRef, useState } from "react";
import { BG_MODEL_URL } from "~/config";
import { IntakeFailure, decodeImage } from "./browserImage";
import type { IntakeError } from "./intake";
import type { Stage } from "./pipeline";
import type { Raster } from "./raster";
import type { WorkerMessage, WorkerResult } from "./worker-protocol";

export type RemoverState =
  | { status: "idle" }
  | { status: "working"; stage: Stage | "decoding"; progress?: number }
  | { status: "done"; image: Raster; result: Omit<WorkerResult, "alpha"> & { alpha: Uint8ClampedArray } }
  | { status: "error"; reason: IntakeError | "modelUnavailable" | "failed" };

/** Drives the background-removal worker for one image at a time. */
export function useBackgroundRemover() {
  const [state, setState] = useState<RemoverState>({ status: "idle" });
  const worker = useRef<Worker | null>(null);
  const currentId = useRef(0);

  useEffect(() => () => worker.current?.terminate(), []);

  const getWorker = () => {
    worker.current ??= new Worker(new URL("./bgRemover.worker.ts", import.meta.url), { type: "module" });
    return worker.current;
  };

  const process = useCallback(async (file: File) => {
    const id = ++currentId.current;
    setState({ status: "working", stage: "decoding" });
    let image: Raster;
    try {
      image = await decodeImage(file);
    } catch (error) {
      setState({ status: "error", reason: error instanceof IntakeFailure ? error.reason : "unreadable" });
      return;
    }
    if (id !== currentId.current) return;

    const instance = getWorker();
    instance.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (message.id !== currentId.current) return;
      if (message.type === "stage") setState({ status: "working", stage: message.stage, progress: message.progress });
      if (message.type === "error") setState({ status: "error", reason: message.reason });
      if (message.type === "done") {
        setState({
          status: "done",
          image,
          result: { ...message.result, alpha: new Uint8ClampedArray(message.result.alpha) },
        });
      }
    };
    // Send a copy: the original pixels stay here to compose the result.
    const pixels = image.data.slice().buffer;
    instance.postMessage(
      { type: "run", id, width: image.width, height: image.height, pixels, modelUrl: BG_MODEL_URL },
      [pixels],
    );
  }, []);

  const reset = useCallback(() => {
    currentId.current++;
    setState({ status: "idle" });
  }, []);

  return { state, process, reset };
}
