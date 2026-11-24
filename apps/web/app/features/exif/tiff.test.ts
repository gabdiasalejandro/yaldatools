import { describe, expect, it } from "vitest";
import { makeTiff } from "./testFiles";
import { orientationOnlyTiff, readOrientation } from "./tiff";

describe("readOrientation", () => {
  it("reads the Orientation tag from a little-endian TIFF", () => {
    expect(readOrientation(makeTiff({ orientation: 6, make: "Cam", gps: true }))).toBe(6);
  });

  it("defaults to 1 when the tag is missing, invalid or the data is broken", () => {
    expect(readOrientation(makeTiff({ make: "Cam" }))).toBe(1);
    expect(readOrientation(makeTiff({ orientation: 42 }))).toBe(1);
    expect(readOrientation(Uint8Array.of(1, 2, 3))).toBe(1);
  });
});

describe("orientationOnlyTiff", () => {
  it("builds a valid TIFF with a single Orientation entry", () => {
    const tiff = orientationOnlyTiff(6);
    expect(readOrientation(tiff)).toBe(6);
    // Header (8) + entry count (2) + one entry (12) + next-IFD offset (4).
    expect(tiff.length).toBe(26);
    expect([...tiff.subarray(8, 10)]).toEqual([0, 1]);
  });
});
