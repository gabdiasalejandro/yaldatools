import { describe, expect, it } from "vitest";
import { floodFillAlpha, foregroundRatio } from "./floodFill";
import { makeRaster, squareOnWhite } from "./testImages";

const alphaAt = (alpha: Uint8ClampedArray, width: number, x: number, y: number) => alpha[y * width + x];

describe("floodFillAlpha", () => {
  it("makes the background connected to the border transparent and keeps the subject", () => {
    const image = squareOnWhite(100);
    const alpha = floodFillAlpha(image, [255, 255, 255]);
    expect(alphaAt(alpha, 100, 0, 0)).toBe(0);
    expect(alphaAt(alpha, 100, 99, 50)).toBe(0);
    expect(alphaAt(alpha, 100, 50, 50)).toBe(255);
    expect(foregroundRatio(alpha)).toBeCloseTo(0.16, 2);
  });

  it("tolerates small variations such as JPEG noise in the background", () => {
    const image = makeRaster(50, 50, (x, y) =>
      x > 20 && x < 30 && y > 20 && y < 30 ? [0, 0, 0] : [250 + ((x + y) % 5), 250, 252],
    );
    const alpha = floodFillAlpha(image, [252, 250, 252]);
    expect(alphaAt(alpha, 50, 5, 5)).toBe(0);
    expect(alphaAt(alpha, 50, 25, 25)).toBe(255);
  });

  it("keeps background-colored areas enclosed by the subject", () => {
    // A black ring with a white hole: the hole is not reachable from the border.
    const image = makeRaster(60, 60, (x, y) => {
      const d = Math.hypot(x - 30, y - 30);
      return d > 10 && d < 20 ? [0, 0, 0] : [255, 255, 255];
    });
    const alpha = floodFillAlpha(image, [255, 255, 255]);
    expect(alphaAt(alpha, 60, 30, 30)).toBe(255);
    expect(alphaAt(alpha, 60, 2, 2)).toBe(0);
  });

  it("softens the subject edge with intermediate alpha", () => {
    const image = makeRaster(20, 20, (x) => (x < 10 ? [255, 255, 255] : x === 10 ? [200, 200, 200] : [0, 0, 0]));
    const alpha = floodFillAlpha(image, [255, 255, 255]);
    const edge = alphaAt(alpha, 20, 10, 10);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
    expect(alphaAt(alpha, 20, 15, 10)).toBe(255);
  });
});
