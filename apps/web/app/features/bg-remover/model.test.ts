import { describe, expect, it } from "vitest";
import { DOUBTFUL_THRESHOLD, difficultyFor, doubtfulRatio, outputToAlpha, resizeMask, toInputTensor } from "./model";
import { makeRaster } from "./testImages";

describe("toInputTensor", () => {
  it("lays out RGB planes, scaled by the brightest value and centered on 0", () => {
    const image = makeRaster(2, 1, (x) => (x === 0 ? [255, 0, 0] : [0, 51, 255]));
    const tensor = toInputTensor(image);
    // Planes: R R | G G | B B
    const expected = [0.5, -0.5, -0.5, -0.3, -0.5, 0.5];
    expect(tensor).toHaveLength(expected.length);
    expected.forEach((value, i) => expect(tensor[i]).toBeCloseTo(value, 5));
  });

  it("does not divide by zero on a black image", () => {
    const tensor = toInputTensor(makeRaster(1, 1, () => [0, 0, 0]));
    expect(Array.from(tensor)).toEqual([-0.5, -0.5, -0.5]);
  });
});

describe("outputToAlpha", () => {
  it("stretches the prediction to the full 0–255 range", () => {
    expect(Array.from(outputToAlpha(new Float32Array([0.2, 0.6, 1.0])))).toEqual([0, 128, 255]);
  });

  it("returns an empty mask for a flat prediction", () => {
    expect(Array.from(outputToAlpha(new Float32Array([0.4, 0.4])))).toEqual([0, 0]);
  });
});

describe("resizeMask", () => {
  it("scales with bilinear interpolation", () => {
    const mask = new Uint8ClampedArray([0, 255]);
    expect(Array.from(resizeMask(mask, 2, 1, 4, 1))).toEqual([0, 64, 191, 255]);
  });

  it("keeps the mask when the size does not change", () => {
    const mask = new Uint8ClampedArray([1, 2, 3, 4]);
    expect(Array.from(resizeMask(mask, 2, 2, 2, 2))).toEqual([1, 2, 3, 4]);
  });
});

describe("doubtfulRatio", () => {
  it("is the share of semi-transparent pixels within the visible subject", () => {
    const alpha = new Uint8ClampedArray([0, 0, 255, 255, 255, 128]);
    expect(doubtfulRatio(alpha)).toBeCloseTo(0.25, 5);
  });

  it("is fully doubtful when nothing was detected", () => {
    expect(doubtfulRatio(new Uint8ClampedArray([0, 0]))).toBe(1);
  });
});

describe("difficultyFor", () => {
  it("uses a 7 % threshold, calibrated with user-judged photos", () => {
    expect(DOUBTFUL_THRESHOLD).toBe(0.07);
  });

  it("is easy with flood fill, medium or hard with the model", () => {
    expect(difficultyFor("floodFill", 0)).toBe("easy");
    expect(difficultyFor("model", 0.05)).toBe("medium");
    expect(difficultyFor("model", 0.08)).toBe("hard");
  });
});
