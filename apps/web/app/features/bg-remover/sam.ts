// Pre- and post-processing for SlimSAM (Segment Anything), matching the
// Hugging Face SamProcessor: resize the longest side to 1024, normalize with
// ImageNet statistics, pad to 1024×1024; masks come back as 256×256 logits.
import type { AlphaMask, Raster } from "./raster";

export const SAM_SIDE = 1024;
export const SAM_MASK_SIDE = 256;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export type SamPoint = { x: number; y: number; include: boolean };

export function samResizeSize(width: number, height: number): { width: number; height: number } {
  const scale = SAM_SIDE / Math.max(width, height);
  return { width: Math.floor(width * scale + 0.5), height: Math.floor(height * scale + 0.5) };
}

/** CHW tensor of an image already resized with samResizeSize, zero-padded to 1024×1024. */
export function toSamPixels(resized: Raster): Float32Array {
  const plane = SAM_SIDE * SAM_SIDE;
  const tensor = new Float32Array(plane * 3);
  for (let y = 0; y < resized.height; y++) {
    for (let x = 0; x < resized.width; x++) {
      const i = (y * resized.width + x) * 4;
      const p = y * SAM_SIDE + x;
      for (let c = 0; c < 3; c++) tensor[c * plane + p] = (resized.data[i + c] / 255 - MEAN[c]) / STD[c];
    }
  }
  return tensor;
}

/** Points in original pixels → flat coordinates in the resized image, plus 1/0 labels. */
export function scalePoints(
  points: readonly SamPoint[],
  width: number,
  height: number,
  resizedWidth: number,
  resizedHeight: number,
): { coords: number[]; labels: number[] } {
  return {
    coords: points.flatMap((point) => [(point.x * resizedWidth) / width, (point.y * resizedHeight) / height]),
    labels: points.map((point) => (point.include ? 1 : 0)),
  };
}

export function bestMaskIndex(scores: Float32Array): number {
  let best = 0;
  for (let i = 1; i < scores.length; i++) if (scores[i] > scores[best]) best = i;
  return best;
}

/**
 * Samples the chosen 256×256 logit mask at every original pixel (through the
 * resized, padded 1024 grid) and turns logits into alpha with a sigmoid, which
 * keeps a thin soft edge.
 */
export function samLogitsToAlpha(
  masks: Float32Array,
  index: number,
  resizedWidth: number,
  resizedHeight: number,
  width: number,
  height: number,
): AlphaMask {
  const plane = SAM_MASK_SIDE * SAM_MASK_SIDE;
  const offset = index * plane;
  const toMask = SAM_MASK_SIDE / SAM_SIDE;
  const alpha = new Uint8ClampedArray(width * height);
  const max = SAM_MASK_SIDE - 1;

  for (let y = 0; y < height; y++) {
    const gy = Math.min(Math.max(((y + 0.5) * resizedHeight) / height * toMask - 0.5, 0), max);
    const y0 = Math.floor(gy);
    const y1 = Math.min(y0 + 1, max);
    const wy = gy - y0;
    for (let x = 0; x < width; x++) {
      const gx = Math.min(Math.max(((x + 0.5) * resizedWidth) / width * toMask - 0.5, 0), max);
      const x0 = Math.floor(gx);
      const x1 = Math.min(x0 + 1, max);
      const wx = gx - x0;
      const top = masks[offset + y0 * SAM_MASK_SIDE + x0] * (1 - wx) + masks[offset + y0 * SAM_MASK_SIDE + x1] * wx;
      const bottom = masks[offset + y1 * SAM_MASK_SIDE + x0] * (1 - wx) + masks[offset + y1 * SAM_MASK_SIDE + x1] * wx;
      const logit = top * (1 - wy) + bottom * wy;
      alpha[y * width + x] = Math.round(255 / (1 + Math.exp(-logit)));
    }
  }
  return alpha;
}
