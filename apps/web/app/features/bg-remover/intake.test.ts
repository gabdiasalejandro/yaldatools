import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, MAX_SIDE, checkFile, fitWithin } from "./intake";

describe("checkFile", () => {
  it("accepts JPG, PNG and WebP up to 25 MB", () => {
    expect(checkFile({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(checkFile({ type: "image/png", size: MAX_FILE_BYTES })).toBeNull();
    expect(checkFile({ type: "image/webp", size: 1 })).toBeNull();
  });

  it("rejects other formats", () => {
    expect(checkFile({ type: "image/gif", size: 1000 })).toBe("unsupportedType");
    expect(checkFile({ type: "", size: 1000 })).toBe("unsupportedType");
  });

  it("rejects files over 25 MB", () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(checkFile({ type: "image/png", size: MAX_FILE_BYTES + 1 })).toBe("tooLarge");
  });
});

describe("fitWithin", () => {
  it("shrinks the longest side to 2048 px keeping the aspect ratio", () => {
    expect(MAX_SIDE).toBe(2048);
    expect(fitWithin(4096, 2048)).toEqual({ width: 2048, height: 1024 });
    expect(fitWithin(1000, 3000)).toEqual({ width: 683, height: 2048 });
  });

  it("never enlarges small images", () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
