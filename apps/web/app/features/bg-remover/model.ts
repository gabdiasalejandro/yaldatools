import type { AlphaMask, Raster } from "./raster";
import type { TriageRoute } from "./triage";

/** ISNet works on a fixed 1024×1024 input. */
export const MODEL_SIDE = 1024;
/** Starting point for "hard" images; to be calibrated with real photos. */
export const DOUBTFUL_THRESHOLD = 0.15;
const DOUBT_LOW = 25;
const DOUBT_HIGH = 230;

export type Difficulty = "easy" | "medium" | "hard";

/**
 * ISNet input in CHW order, as rembg prepares it: values divided by the
 * brightest one in the image and shifted by -0.5 (mean 0.5, std 1).
 */
export function toInputTensor(image: Raster): Float32Array {
  const pixels = image.width * image.height;
  let max = 0;
  for (let i = 0; i < image.data.length; i += 4) {
    max = Math.max(max, image.data[i], image.data[i + 1], image.data[i + 2]);
  }
  const scale = max > 0 ? 1 / max : 0;
  const tensor = new Float32Array(pixels * 3);
  for (let p = 0; p < pixels; p++) {
    const i = p * 4;
    tensor[p] = image.data[i] * scale - 0.5;
    tensor[pixels + p] = image.data[i + 1] * scale - 0.5;
    tensor[2 * pixels + p] = image.data[i + 2] * scale - 0.5;
  }
  return tensor;
}

/** Stretches the model prediction to 0–255 alpha (min–max normalization). */
export function outputToAlpha(prediction: Float32Array): AlphaMask {
  let min = Infinity;
  let max = -Infinity;
  for (const value of prediction) {
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const alpha = new Uint8ClampedArray(prediction.length);
  const range = max - min;
  if (range <= 1e-6) return alpha;
  for (let i = 0; i < prediction.length; i++) alpha[i] = Math.round(((prediction[i] - min) / range) * 255);
  return alpha;
}

/** Bilinear resize of a one-channel mask (pixel centers aligned). */
export function resizeMask(mask: AlphaMask, width: number, height: number, toWidth: number, toHeight: number): AlphaMask {
  if (width === toWidth && height === toHeight) return mask.slice();
  const out = new Uint8ClampedArray(toWidth * toHeight);
  const sx = width / toWidth;
  const sy = height / toHeight;
  for (let y = 0; y < toHeight; y++) {
    const fy = Math.min(Math.max((y + 0.5) * sy - 0.5, 0), height - 1);
    const y0 = Math.floor(fy);
    const y1 = Math.min(y0 + 1, height - 1);
    const wy = fy - y0;
    for (let x = 0; x < toWidth; x++) {
      const fx = Math.min(Math.max((x + 0.5) * sx - 0.5, 0), width - 1);
      const x0 = Math.floor(fx);
      const x1 = Math.min(x0 + 1, width - 1);
      const wx = fx - x0;
      const top = mask[y0 * width + x0] * (1 - wx) + mask[y0 * width + x1] * wx;
      const bottom = mask[y1 * width + x0] * (1 - wx) + mask[y1 * width + x1] * wx;
      out[y * toWidth + x] = Math.round(top * (1 - wy) + bottom * wy);
    }
  }
  return out;
}

/** Share of semi-transparent pixels among the visible ones: how unsure the cut is. */
export function doubtfulRatio(alpha: AlphaMask): number {
  let visible = 0;
  let doubtful = 0;
  for (const value of alpha) {
    if (value <= DOUBT_LOW) continue;
    visible++;
    if (value < DOUBT_HIGH) doubtful++;
  }
  return visible > 0 ? doubtful / visible : 1;
}

export function difficultyFor(route: TriageRoute, doubtful: number): Difficulty {
  if (route === "floodFill") return "easy";
  return doubtful > DOUBTFUL_THRESHOLD ? "hard" : "medium";
}
