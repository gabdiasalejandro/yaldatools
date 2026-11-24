import { describe, expect, it } from "vitest";
import { makeRaster, squareOnNoise, squareOnWhite } from "./testImages";
import { triage } from "./triage";

describe("triage", () => {
  it("sends a plain background to flood fill", () => {
    const result = triage(squareOnWhite());
    expect(result.background).toEqual([255, 255, 255]);
    expect(result.borderUniformity).toBe(1);
    expect(result.contrast).toBeGreaterThan(0.5);
    expect(result.route).toBe("floodFill");
  });

  it("sends a busy background to the model", () => {
    const result = triage(squareOnNoise());
    expect(result.borderUniformity).toBeLessThan(0.5);
    expect(result.edgeDensity).toBeGreaterThan(triage(squareOnWhite()).edgeDensity);
    expect(result.route).toBe("model");
  });

  it("sends a subject too similar to its background to the model", () => {
    const faint = makeRaster(100, 100, (x, y) => (x > 30 && x < 70 && y > 30 && y < 70 ? [240, 240, 240] : [255, 255, 255]));
    const result = triage(faint);
    expect(result.borderUniformity).toBe(1);
    expect(result.contrast).toBeLessThan(0.15);
    expect(result.route).toBe("model");
  });

  it("reports metrics between 0 and 1", () => {
    for (const image of [squareOnWhite(), squareOnNoise()]) {
      const { borderUniformity, contrast, edgeDensity } = triage(image);
      for (const value of [borderUniformity, contrast, edgeDensity]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});
