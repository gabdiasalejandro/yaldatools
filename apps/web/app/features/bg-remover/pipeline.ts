import { floodFillAlpha, foregroundRatio } from "./floodFill";
import {
  MODEL_SIDE,
  difficultyFor,
  doubtfulRatio,
  outputToAlpha,
  resizeMask,
  toInputTensor,
  type Difficulty,
} from "./model";
import type { AlphaMask, Raster, Rgb } from "./raster";
import { triage, type TriageResult } from "./triage";

/** Port for the segmentation model: 1024×1024 CHW input → 1024×1024 prediction. */
export interface Segmenter {
  segment(input: Float32Array): Promise<Float32Array>;
}

export type Stage = "triage" | "loadingModel" | "segmenting";

export type RemovalResult = {
  alpha: AlphaMask;
  triage: TriageResult;
  method: "floodFill" | "model";
  difficulty: Difficulty;
  /** Share of semi-transparent pixels in the subject (0 for flood fill). */
  doubtful: number;
  /** Server refinement is phase 3, so everything runs on the device for now. */
  processedOn: "device";
};

/** Flood fill that keeps less than this, or more, probably failed. */
const MIN_SUBJECT = 0.01;
const MAX_SUBJECT = 0.98;

/** Bilinear resize of an RGBA image. */
export function resizeRaster(image: Raster, width: number, height: number): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let channel = 0; channel < 4; channel++) {
    const plane = new Uint8ClampedArray(image.width * image.height);
    for (let p = 0; p < plane.length; p++) plane[p] = image.data[p * 4 + channel];
    const resized = resizeMask(plane, image.width, image.height, width, height);
    for (let p = 0; p < resized.length; p++) data[p * 4 + channel] = resized[p];
  }
  return { width, height, data };
}

async function segmentWithModel(
  image: Raster,
  loadModel: () => Promise<Segmenter>,
  onStage: (stage: Stage) => void,
): Promise<AlphaMask> {
  onStage("loadingModel");
  const segmenter = await loadModel();
  onStage("segmenting");
  const input = toInputTensor(resizeRaster(image, MODEL_SIDE, MODEL_SIDE));
  const prediction = await segmenter.segment(input);
  return resizeMask(outputToAlpha(prediction), MODEL_SIDE, MODEL_SIDE, image.width, image.height);
}

/**
 * Picks the cheapest method that works: flood fill for plain backgrounds,
 * the model otherwise (or when flood fill clearly failed).
 */
export async function removeBackground(
  image: Raster,
  loadModel: () => Promise<Segmenter>,
  onStage: (stage: Stage) => void = () => {},
): Promise<RemovalResult> {
  onStage("triage");
  const analysis = triage(image);

  if (analysis.route === "floodFill") {
    const alpha = floodFillAlpha(image, analysis.background);
    const subject = foregroundRatio(alpha);
    if (subject >= MIN_SUBJECT && subject <= MAX_SUBJECT) {
      return { alpha, triage: analysis, method: "floodFill", difficulty: "easy", doubtful: 0, processedOn: "device" };
    }
  }

  const alpha = await segmentWithModel(image, loadModel, onStage);
  const doubtful = doubtfulRatio(alpha);
  return {
    alpha,
    triage: analysis,
    method: "model",
    difficulty: difficultyFor("model", doubtful),
    doubtful,
    processedOn: "device",
  };
}

/** Applies the alpha mask; with a color, blends the subject over it instead. */
export function compose(image: Raster, alpha: AlphaMask, background: Rgb | null): Raster {
  const data = new Uint8ClampedArray(image.data.length);
  for (let p = 0; p < alpha.length; p++) {
    const i = p * 4;
    if (!background) {
      data[i] = image.data[i];
      data[i + 1] = image.data[i + 1];
      data[i + 2] = image.data[i + 2];
      data[i + 3] = alpha[p];
      continue;
    }
    const a = alpha[p] / 255;
    data[i] = Math.round(image.data[i] * a + background[0] * (1 - a));
    data[i + 1] = Math.round(image.data[i + 1] * a + background[1] * (1 - a));
    data[i + 2] = Math.round(image.data[i + 2] * a + background[2] * (1 - a));
    data[i + 3] = 255;
  }
  return { width: image.width, height: image.height, data };
}
