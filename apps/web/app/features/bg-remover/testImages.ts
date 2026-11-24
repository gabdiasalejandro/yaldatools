import type { Raster, Rgb } from "./raster";

/** Builds a synthetic test image pixel by pixel. */
export function makeRaster(width: number, height: number, paint: (x: number, y: number) => Rgb): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return { width, height, data };
}

/** Deterministic pseudo-random generator, so noisy test images are reproducible. */
export function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/** A dark square in the middle of a plain white image. */
export function squareOnWhite(size = 100): Raster {
  const lo = size * 0.3;
  const hi = size * 0.7;
  return makeRaster(size, size, (x, y) => (x >= lo && x < hi && y >= lo && y < hi ? [20, 30, 120] : [255, 255, 255]));
}

/** The same square over random noise, like a busy photo background. */
export function squareOnNoise(size = 100): Raster {
  const random = seeded(7);
  const lo = size * 0.3;
  const hi = size * 0.7;
  return makeRaster(size, size, (x, y) => {
    if (x >= lo && x < hi && y >= lo && y < hi) return [20, 30, 120];
    return [random() * 255, random() * 255, random() * 255];
  });
}
