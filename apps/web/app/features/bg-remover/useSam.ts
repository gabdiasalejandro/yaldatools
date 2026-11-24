import { useCallback, useEffect, useRef, useState } from "react";
import { SAM_MODEL_BASE } from "~/config";
import type { AlphaMask, Raster } from "./raster";
import type { SamPoint } from "./sam";
import type { SamMessage, SamRequest } from "./sam.worker";

export type SamStatus =
  | { status: "idle" }
  | { status: "loadingModel"; progress?: number }
  | { status: "embedding" }
  | { status: "ready" }
  | { status: "error" };

let nextId = 0;

/** Tap-to-select for one image: prepares the embedding on demand, then decodes taps. */
export function useSam(image: Raster) {
  const [state, setState] = useState<SamStatus>({ status: "idle" });
  const worker = useRef<Worker | null>(null);
  const id = useRef(++nextId);
  const pending = useRef<{ resolve: (alpha: AlphaMask) => void; reject: () => void } | null>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  const prepare = useCallback(() => {
    if (worker.current) return;
    const instance = new Worker(new URL("./sam.worker.ts", import.meta.url), { type: "module" });
    worker.current = instance;
    instance.onmessage = (event: MessageEvent<SamMessage>) => {
      const message = event.data;
      if (message.id !== id.current) return;
      if (message.type === "progress") {
        setState(message.stage === "loadingModel" ? { status: "loadingModel", progress: message.progress } : { status: "embedding" });
      } else if (message.type === "ready") {
        setState({ status: "ready" });
      } else if (message.type === "mask") {
        pending.current?.resolve(new Uint8ClampedArray(message.alpha));
        pending.current = null;
      } else {
        pending.current?.reject();
        pending.current = null;
        setState((previous) => (previous.status === "ready" ? previous : { status: "error" }));
      }
    };
    setState({ status: "loadingModel" });
    const pixels = image.data.slice().buffer;
    const request: SamRequest = {
      type: "embed",
      id: id.current,
      width: image.width,
      height: image.height,
      pixels,
      modelBase: SAM_MODEL_BASE,
    };
    instance.postMessage(request, [pixels]);
  }, [image]);

  const select = useCallback((points: SamPoint[]) => {
    const instance = worker.current;
    if (!instance) return Promise.reject(new Error("SAM is not ready"));
    pending.current?.reject();
    return new Promise<AlphaMask>((resolve, reject) => {
      pending.current = { resolve, reject };
      const request: SamRequest = { type: "decode", id: id.current, points };
      instance.postMessage(request);
    });
  }, []);

  return { state, prepare, select };
}
