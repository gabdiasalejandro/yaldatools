import { describe, expect, it } from "vitest";
import { concat } from "./bytes";
import { parsePng, stripPng } from "./png";
import { PNG_PARTS as P, makePng, makeTiff, pngChunk } from "./testFiles";
import { readOrientation } from "./tiff";

const types = (bytes: Uint8Array) => parsePng(bytes).map((chunk) => chunk.type);

describe("stripPng", () => {
  const exif = pngChunk("eXIf", makeTiff({ make: "Cam", gps: true }));
  const full = makePng([P.ihdr, P.iccp, P.gama, exif, P.text, P.ztxt, P.itxt, P.time, P.idat, P.text, P.iend]);

  it("drops eXIf, text and time chunks and keeps color and image chunks byte for byte", () => {
    const out = stripPng(full);
    expect(types(out)).toEqual(["IHDR", "iCCP", "gAMA", "IDAT", "IEND"]);
    expect(out).toEqual(makePng([P.ihdr, P.iccp, P.gama, P.idat, P.iend]));
    // parsePng checks the signature and every CRC.
    expect(() => parsePng(out)).not.toThrow();
  });

  it("keeps a minimal Orientation-only eXIf before the image data when rotated", () => {
    const rotated = makePng([P.ihdr, P.idat, pngChunk("eXIf", makeTiff({ orientation: 6, gps: true })), P.iend]);
    const chunks = parsePng(stripPng(rotated));
    expect(chunks.map((chunk) => chunk.type)).toEqual(["IHDR", "eXIf", "IDAT", "IEND"]);
    expect(readOrientation(chunks[1].data)).toBe(6);
    expect(chunks[1].data.length).toBe(26);
  });

  it("drops data after IEND and is idempotent", () => {
    const once = stripPng(concat([full, Uint8Array.of(9, 9)]));
    expect(once).toEqual(makePng([P.ihdr, P.iccp, P.gama, P.idat, P.iend]));
    expect(stripPng(once)).toEqual(once);
  });

  it("rejects a corrupted chunk", () => {
    const broken = full.slice();
    broken[broken.length - 1] ^= 0xff;
    expect(() => stripPng(broken)).toThrow();
  });
});
