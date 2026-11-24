import { describe, expect, it } from "vitest";
import { SAM_MASK_SIDE, SAM_SIDE, bestMaskIndex, samLogitsToAlpha, samResizeSize, scalePoints, toSamPixels } from "./sam";
import { makeRaster } from "./testImages";

describe("samResizeSize", () => {
  it("fits the longest side to 1024 px", () => {
    expect(samResizeSize(2048, 1024)).toEqual({ width: 1024, height: 512 });
    expect(samResizeSize(300, 600)).toEqual({ width: 512, height: 1024 });
  });
});

describe("toSamPixels", () => {
  it("normalizes with ImageNet mean and std and pads with zeros", () => {
    const image = makeRaster(2, 1, () => [255, 0, 0]);
    const tensor = toSamPixels(image);
    const plane = SAM_SIDE * SAM_SIDE;
    expect(tensor).toHaveLength(3 * plane);
    expect(tensor[0]).toBeCloseTo((1 - 0.485) / 0.229, 4);
    expect(tensor[plane]).toBeCloseTo((0 - 0.456) / 0.224, 4);
    expect(tensor[2]).toBe(0); // padding to the right of the image
    expect(tensor[SAM_SIDE]).toBe(0); // padding below the image
  });
});

describe("scalePoints", () => {
  it("converts original pixel positions to the resized image", () => {
    expect(scalePoints([{ x: 100, y: 50, include: true }], 2048, 1024, 1024, 512)).toEqual({
      coords: [50, 25],
      labels: [1],
    });
    expect(scalePoints([{ x: 0, y: 0, include: false }], 10, 10, 10, 10).labels).toEqual([0]);
  });
});

describe("bestMaskIndex", () => {
  it("picks the candidate with the highest predicted quality", () => {
    expect(bestMaskIndex(new Float32Array([0.2, 0.9, 0.5]))).toBe(1);
  });
});

describe("samLogitsToAlpha", () => {
  it("upscales the chosen mask to the original size and maps logits to alpha", () => {
    const plane = SAM_MASK_SIDE * SAM_MASK_SIDE;
    const masks = new Float32Array(plane * 3).fill(-20);
    // Candidate 1: the left half of the (square) image is the subject.
    for (let y = 0; y < SAM_MASK_SIDE; y++) for (let x = 0; x < SAM_MASK_SIDE / 2; x++) masks[plane + y * SAM_MASK_SIDE + x] = 20;
    const alpha = samLogitsToAlpha(masks, 1, 1024, 1024, 100, 100);
    expect(alpha).toHaveLength(100 * 100);
    expect(alpha[50 * 100 + 10]).toBe(255);
    expect(alpha[50 * 100 + 90]).toBe(0);
  });

  it("ignores the padding of non-square images", () => {
    const plane = SAM_MASK_SIDE * SAM_MASK_SIDE;
    const masks = new Float32Array(plane).fill(-20);
    // Only the top half of the padded grid holds the 1024×512 image: mark it all as subject.
    for (let y = 0; y < SAM_MASK_SIDE / 2; y++) for (let x = 0; x < SAM_MASK_SIDE; x++) masks[y * SAM_MASK_SIDE + x] = 20;
    const alpha = samLogitsToAlpha(masks, 0, 1024, 512, 200, 100);
    expect(alpha[90 * 200 + 100]).toBe(255);
  });
});
