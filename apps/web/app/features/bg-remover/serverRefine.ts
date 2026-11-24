// Client for the server refinement API (apps/api): BiRefNet lite, then full.
import { resizeMask } from "./model";
import type { AlphaMask, Raster } from "./raster";

export type ServerModel = "lite" | "full";
export type ServerModelName = "birefnet-lite" | "birefnet";
export type RefineError = "busy" | "modelUnavailable" | "tooLarge" | "unreachable" | "failed";

export type RefineResult = {
  alpha: AlphaMask;
  model: ServerModelName;
  seconds: number;
  bytesSent: number;
};

export class RefineFailure extends Error {
  constructor(readonly reason: RefineError) {
    super(reason);
  }
}

/** Lite first; the full model only when the user asks again. */
export function nextServerModel(current: ServerModelName | null): ServerModel | null {
  if (current === null) return "lite";
  return current === "birefnet-lite" ? "full" : null;
}

export function refineErrorFor(status: number, body: { error?: string } | null): RefineError {
  if (status === 503) return "busy";
  if (status === 400 && body?.error === "model_unavailable") return "modelUnavailable";
  if (status === 413) return "tooLarge";
  // 0 = network error; 502/504 = the proxy could not reach the API.
  if (status === 0 || status === 502 || status === 504) return "unreachable";
  return "failed";
}

function toJpeg(image: Raster): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new RefineFailure("failed"))), "image/jpeg", 0.92),
  );
}

async function maskFromPng(blob: Blob, width: number, height: number): Promise<AlphaMask> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new RefineFailure("failed");
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
  const mask = new Uint8ClampedArray(bitmap.width * bitmap.height);
  for (let p = 0; p < mask.length; p++) mask[p] = data[p * 4];
  bitmap.close();
  return resizeMask(mask, canvas.width, canvas.height, width, height);
}

/** Sends the (already downscaled) image; the server keeps it only in memory. */
export async function refineOnServer(image: Raster, model: ServerModel): Promise<RefineResult> {
  const body = await toJpeg(image);
  let response: Response;
  try {
    response = await fetch(`/api/quitar-fondo?model=${model}`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body,
    });
  } catch {
    throw new RefineFailure("unreachable");
  }
  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new RefineFailure(refineErrorFor(response.status, details));
  }
  return {
    alpha: await maskFromPng(await response.blob(), image.width, image.height),
    model: response.headers.get("X-Model") === "birefnet" ? "birefnet" : "birefnet-lite",
    seconds: Number(response.headers.get("X-Processing-Seconds")) || 0,
    bytesSent: body.size,
  };
}
