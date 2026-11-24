import { MAX_COLOR_DISTANCE, borderPixels, colorDistance, type Raster, type Rgb } from "./raster";

/** Colors closer than this to the background color count as background. */
export const BACKGROUND_TOLERANCE = 32;
/** Share of the border that must match the background color for flood fill. */
export const MIN_BORDER_UNIFORMITY = 0.9;
/** Subject vs background contrast needed for flood fill to find a clean edge. */
export const MIN_CONTRAST = 0.15;
const EDGE_THRESHOLD = 100;

export type TriageRoute = "floodFill" | "model";

export type TriageResult = {
  /** Median color of the image border. */
  background: Rgb;
  /** Share of border pixels close to that color (0–1). */
  borderUniformity: number;
  /** Mean distance of non-background pixels to the background color (0–1). */
  contrast: number;
  /** Share of pixels on a strong edge (0–1); busy photos score high. */
  edgeDensity: number;
  route: TriageRoute;
};

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function borderColor(image: Raster, border: number[]): Rgb {
  const channel = (offset: number) => median(border.map((pixel) => image.data[pixel * 4 + offset]));
  return [channel(0), channel(1), channel(2)];
}

function luminance(image: Raster): Float32Array {
  const lum = new Float32Array(image.width * image.height);
  for (let p = 0; p < lum.length; p++) {
    const i = p * 4;
    lum[p] = 0.299 * image.data[i] + 0.587 * image.data[i + 1] + 0.114 * image.data[i + 2];
  }
  return lum;
}

function sobelEdgeDensity(image: Raster): number {
  const { width, height } = image;
  if (width < 3 || height < 3) return 0;
  const lum = luminance(image);
  const at = (x: number, y: number) => lum[y * width + x];
  let edges = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const gx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const gy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      if (Math.hypot(gx, gy) > EDGE_THRESHOLD) edges++;
    }
  }
  return edges / ((width - 2) * (height - 2));
}

/** Measures how hard the image is and picks the cheapest method that can work. */
export function triage(image: Raster): TriageResult {
  const { width, height, data } = image;
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.02));
  const border = borderPixels(width, height, band);
  const background = borderColor(image, border);

  const uniform = border.filter((pixel) => colorDistance(data, pixel * 4, background) <= BACKGROUND_TOLERANCE).length;
  const borderUniformity = uniform / border.length;

  let subjectPixels = 0;
  let subjectDistance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const distance = colorDistance(data, i, background);
    if (distance > BACKGROUND_TOLERANCE) {
      subjectPixels++;
      subjectDistance += distance;
    }
  }
  const contrast = subjectPixels > 0 ? subjectDistance / subjectPixels / MAX_COLOR_DISTANCE : 0;
  const edgeDensity = sobelEdgeDensity(image);

  const route: TriageRoute =
    borderUniformity >= MIN_BORDER_UNIFORMITY && contrast >= MIN_CONTRAST ? "floodFill" : "model";
  return { background, borderUniformity, contrast, edgeDensity, route };
}
