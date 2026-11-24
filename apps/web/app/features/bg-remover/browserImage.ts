// Browser-only helpers to turn files into pixels and pixels into PNG files.
import { checkFile, fitWithin, type IntakeError } from "./intake";
import type { Raster } from "./raster";

export class IntakeFailure extends Error {
  constructor(readonly reason: IntakeError) {
    super(reason);
  }
}

/** Validates, decodes and downscales the image to at most 2048 px on its longest side. */
export async function decodeImage(file: File): Promise<Raster> {
  const problem = checkFile(file);
  if (problem) throw new IntakeFailure(problem);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new IntakeFailure("unreadable");
  }
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new IntakeFailure("unreadable");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const { data } = context.getImageData(0, 0, width, height);
  return { width, height, data };
}

export function drawRaster(canvas: HTMLCanvasElement, image: Raster): void {
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(image.data), image.width, image.height), 0, 0);
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))), "image/png"),
  );
}
