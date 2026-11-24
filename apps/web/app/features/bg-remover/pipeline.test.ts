import { describe, expect, it, vi } from "vitest";
import { MODEL_SIDE } from "./model";
import { compose, removeBackground, resizeRaster, type Segmenter } from "./pipeline";
import { makeRaster, squareOnNoise, squareOnWhite } from "./testImages";

/** Fake model: a solid subject on the left half and a semi-transparent strip in the middle. */
function fakeSegmenter(): Segmenter & { calls: number } {
  return {
    calls: 0,
    async segment() {
      this.calls++;
      const out = new Float32Array(MODEL_SIDE * MODEL_SIDE);
      for (let y = 0; y < MODEL_SIDE; y++) {
        for (let x = 0; x < MODEL_SIDE; x++) out[y * MODEL_SIDE + x] = x < 400 ? 1 : x < 512 ? 0.5 : 0;
      }
      return out;
    },
  };
}

describe("removeBackground", () => {
  it("cuts a plain background with flood fill, on the device, without loading the model", async () => {
    const loadModel = vi.fn(async () => fakeSegmenter());
    const result = await removeBackground(squareOnWhite(100), loadModel);
    expect(result.method).toBe("floodFill");
    expect(result.difficulty).toBe("easy");
    expect(result.processedOn).toBe("device");
    expect(result.alpha).toHaveLength(100 * 100);
    expect(loadModel).not.toHaveBeenCalled();
  });

  it("uses the model for a busy background and measures the doubtful area", async () => {
    const segmenter = fakeSegmenter();
    const result = await removeBackground(squareOnNoise(100), async () => segmenter);
    expect(segmenter.calls).toBe(1);
    expect(result.method).toBe("model");
    expect(result.alpha).toHaveLength(100 * 100);
    expect(result.doubtful).toBeGreaterThan(0.15);
    expect(result.difficulty).toBe("hard");
    expect(result.processedOn).toBe("device");
  });

  it("falls back to the model when flood fill would erase almost everything", async () => {
    // A uniform image with only a tiny dot: flood fill leaves under 1 % of subject.
    const dot = makeRaster(100, 100, (x, y) => (x === 50 && y === 50 ? [0, 0, 0] : [255, 255, 255]));
    const segmenter = fakeSegmenter();
    const result = await removeBackground(dot, async () => segmenter);
    expect(result.triage.route).toBe("floodFill");
    expect(result.method).toBe("model");
    expect(segmenter.calls).toBe(1);
  });

  it("reports each stage", async () => {
    const stages: string[] = [];
    await removeBackground(squareOnNoise(50), async () => fakeSegmenter(), (stage) => stages.push(stage));
    expect(stages).toEqual(["triage", "loadingModel", "segmenting"]);
  });
});

describe("resizeRaster", () => {
  it("resizes RGBA images", () => {
    const image = makeRaster(4, 4, () => [10, 20, 30]);
    const small = resizeRaster(image, 2, 2);
    expect(small.width).toBe(2);
    expect(Array.from(small.data.slice(0, 4))).toEqual([10, 20, 30, 255]);
  });
});

describe("compose", () => {
  const image = makeRaster(2, 1, () => [200, 100, 0]);
  const alpha = new Uint8ClampedArray([255, 0]);

  it("keeps a transparent background", () => {
    expect(Array.from(compose(image, alpha, null).data)).toEqual([200, 100, 0, 255, 200, 100, 0, 0]);
  });

  it("blends over a solid color", () => {
    expect(Array.from(compose(image, alpha, [255, 255, 255]).data)).toEqual([200, 100, 0, 255, 255, 255, 255, 255]);
    const half = compose(image, new Uint8ClampedArray([128, 128]), [0, 0, 0]);
    expect(Array.from(half.data.slice(0, 4))).toEqual([100, 50, 0, 255]);
  });
});
