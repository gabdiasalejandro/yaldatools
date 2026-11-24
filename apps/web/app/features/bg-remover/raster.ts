// Plain image data shared by the pipeline; compatible with the browser's ImageData.

export type Rgb = [number, number, number];

export type Raster = {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row by row. */
  data: Uint8ClampedArray;
};

/** One alpha byte per pixel: 0 is background, 255 is subject. */
export type AlphaMask = Uint8ClampedArray;

/** Largest possible RGB distance, between black and white. */
export const MAX_COLOR_DISTANCE = Math.sqrt(3 * 255 * 255);

export function colorDistance(data: Uint8ClampedArray, index: number, color: Rgb): number {
  const dr = data[index] - color[0];
  const dg = data[index + 1] - color[1];
  const db = data[index + 2] - color[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Indexes (pixel numbers) of a band of `size` pixels along the four edges. */
export function borderPixels(width: number, height: number, size: number): number[] {
  const pixels: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < size || y < size || x >= width - size || y >= height - size) pixels.push(y * width + x);
    }
  }
  return pixels;
}
