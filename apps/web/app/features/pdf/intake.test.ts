import { describe, expect, it } from "vitest";
import { checkSizes, isPdf, MAX_FILE_BYTES, MAX_TOTAL_BYTES, mergedName } from "./intake";

const MB = 1024 * 1024;

describe("isPdf", () => {
  it("accepts bytes that start with the %PDF- signature", () => {
    expect(isPdf(new TextEncoder().encode("%PDF-1.7\n..."))).toBe(true);
  });

  it("accepts a signature preceded by a little junk, as readers do", () => {
    expect(isPdf(new TextEncoder().encode("﻿\n%PDF-1.4\n"))).toBe(true);
  });

  it("rejects anything else, whatever the file name says", () => {
    expect(isPdf(new TextEncoder().encode("hello, I am a text file"))).toBe(false);
    expect(isPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    expect(isPdf(new Uint8Array())).toBe(false);
  });
});

describe("checkSizes", () => {
  it("has the advertised limits", () => {
    expect(MAX_FILE_BYTES).toBe(100 * MB);
    expect(MAX_TOTAL_BYTES).toBe(300 * MB);
  });

  it("accepts files within both limits", () => {
    expect(checkSizes([{ size: 10 * MB }, { size: 20 * MB }], 0)).toEqual([null, null]);
  });

  it("rejects a single file over 100 MB", () => {
    expect(checkSizes([{ size: 100 * MB + 1 }, { size: MB }], 0)).toEqual(["tooLarge", null]);
  });

  it("rejects files that would take the list over 300 MB, counting what is already there", () => {
    expect(checkSizes([{ size: 90 * MB }, { size: 90 * MB }, { size: 10 * MB }], 150 * MB)).toEqual([
      null,
      "totalTooLarge",
      null,
    ]);
  });

  it("does not count rejected files towards the total", () => {
    expect(checkSizes([{ size: 200 * MB }, { size: 100 * MB }], 201 * MB)).toEqual(["tooLarge", "totalTooLarge"]);
    expect(checkSizes([{ size: 200 * MB }, { size: 100 * MB }], 0)).toEqual(["tooLarge", null]);
  });
});

describe("mergedName", () => {
  it("is the translated name with the .pdf extension", () => {
    expect(mergedName("unido")).toBe("unido.pdf");
    expect(mergedName("merged.pdf")).toBe("merged.pdf");
  });
});
