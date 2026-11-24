import { borderPixels, colorDistance, type AlphaMask, type Raster, type Rgb } from "./raster";
import { BACKGROUND_TOLERANCE } from "./triage";

/** Color distance over the tolerance across which edge pixels fade from clear to solid. */
const EDGE_SOFTNESS = 96;

/**
 * Clears the background reachable from the image border, comparing every
 * pixel with the background color (not with its neighbor, so gradients do not
 * leak into the subject). Subject pixels touching the background get a partial
 * alpha based on how close their color is to the background.
 */
export function floodFillAlpha(image: Raster, background: Rgb, tolerance = BACKGROUND_TOLERANCE): AlphaMask {
  const { width, height, data } = image;
  const total = width * height;
  const isBackground = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const visit = (pixel: number) => {
    if (isBackground[pixel] || colorDistance(data, pixel * 4, background) > tolerance) return;
    isBackground[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (const pixel of borderPixels(width, height, 1)) visit(pixel);
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    if (x > 0) visit(pixel - 1);
    if (x < width - 1) visit(pixel + 1);
    if (pixel >= width) visit(pixel - width);
    if (pixel < total - width) visit(pixel + width);
  }

  const alpha = new Uint8ClampedArray(total);
  for (let pixel = 0; pixel < total; pixel++) {
    if (isBackground[pixel]) continue;
    const x = pixel % width;
    const touchesBackground =
      (x > 0 && isBackground[pixel - 1]) ||
      (x < width - 1 && isBackground[pixel + 1]) ||
      (pixel >= width && isBackground[pixel - width]) ||
      (pixel < total - width && isBackground[pixel + width]);
    if (!touchesBackground) {
      alpha[pixel] = 255;
      continue;
    }
    const distance = colorDistance(data, pixel * 4, background);
    alpha[pixel] = Math.round(255 * Math.min(1, Math.max(0, (distance - tolerance) / EDGE_SOFTNESS)));
  }
  return alpha;
}

/** Share of pixels that are mostly subject. */
export function foregroundRatio(alpha: AlphaMask): number {
  let solid = 0;
  for (const value of alpha) if (value > 127) solid++;
  return alpha.length > 0 ? solid / alpha.length : 0;
}
