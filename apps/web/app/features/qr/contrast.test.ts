import { describe, expect, it } from "vitest";
import { contrastRatio, hasScanRisk } from "./contrast";

describe("contrastRatio", () => {
  it("follows the WCAG formula", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#fff", "#fff")).toBeCloseTo(1, 5);
  });
});

describe("hasScanRisk", () => {
  it("accepts dark dots on a light background", () => {
    expect(hasScanRisk("#000080", "#ffffff")).toBe(false);
    expect(hasScanRisk("#a4307f", "#ffffff")).toBe(false);
  });

  it("warns about low contrast", () => {
    expect(hasScanRisk("#c0c0c0", "#ffffff")).toBe(true);
  });

  it("warns about light dots on a dark background, which many readers fail to scan", () => {
    expect(hasScanRisk("#ffffff", "#000000")).toBe(true);
  });
});
