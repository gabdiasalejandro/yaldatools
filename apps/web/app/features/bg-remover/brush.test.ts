import { describe, expect, it } from "vitest";
import { paintStroke } from "./brush";

const at = (alpha: Uint8ClampedArray, width: number, x: number, y: number) => alpha[y * width + x];

describe("paintStroke", () => {
  it("erases inside the brush and leaves the rest untouched", () => {
    const alpha = new Uint8ClampedArray(20 * 20).fill(255);
    const out = paintStroke(alpha, 20, 20, { x: 10, y: 10 }, { x: 10, y: 10 }, 4, "erase");
    expect(at(out, 20, 10, 10)).toBe(0);
    expect(at(out, 20, 0, 0)).toBe(255);
    expect(at(out, 20, 16, 10)).toBe(255);
  });

  it("restores to fully opaque", () => {
    const alpha = new Uint8ClampedArray(20 * 20);
    const out = paintStroke(alpha, 20, 20, { x: 5, y: 5 }, { x: 5, y: 5 }, 3, "restore");
    expect(at(out, 20, 5, 5)).toBe(255);
    expect(at(out, 20, 15, 15)).toBe(0);
  });

  it("covers the whole segment between two pointer positions", () => {
    const alpha = new Uint8ClampedArray(40 * 10).fill(255);
    const out = paintStroke(alpha, 40, 10, { x: 5, y: 5 }, { x: 35, y: 5 }, 2, "erase");
    for (let x = 5; x <= 35; x++) expect(at(out, 40, x, 5)).toBe(0);
  });

  it("softens the edge of the brush", () => {
    const alpha = new Uint8ClampedArray(30 * 30).fill(255);
    const out = paintStroke(alpha, 30, 30, { x: 15, y: 15 }, { x: 15, y: 15 }, 10, "erase");
    const edge = at(out, 30, 24, 15);
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(255);
  });

  it("never lowers alpha when restoring nor raises it when erasing", () => {
    const alpha = new Uint8ClampedArray(30 * 30).fill(128);
    const erased = paintStroke(alpha, 30, 30, { x: 15, y: 15 }, { x: 15, y: 15 }, 10, "erase");
    const restored = paintStroke(alpha, 30, 30, { x: 15, y: 15 }, { x: 15, y: 15 }, 10, "restore");
    for (let i = 0; i < alpha.length; i++) {
      expect(erased[i]).toBeLessThanOrEqual(128);
      expect(restored[i]).toBeGreaterThanOrEqual(128);
    }
  });

  it("does not modify the input mask", () => {
    const alpha = new Uint8ClampedArray(10 * 10).fill(255);
    paintStroke(alpha, 10, 10, { x: 5, y: 5 }, { x: 5, y: 5 }, 3, "erase");
    expect(alpha.every((value) => value === 255)).toBe(true);
  });
});
