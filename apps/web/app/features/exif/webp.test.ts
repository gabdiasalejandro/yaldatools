import { describe, expect, it } from "vitest";
import { u32le } from "./bytes";
import { makeTiff, makeWebp, vp8x, webpChunk, WEBP_PARTS as P } from "./testFiles";
import { readOrientation } from "./tiff";
import { parseWebp, stripWebp, VP8X_FLAGS } from "./webp";

const ICC = VP8X_FLAGS.icc;
const EXIF = VP8X_FLAGS.exif;
const XMP = VP8X_FLAGS.xmp;
const fourccs = (bytes: Uint8Array) => parseWebp(bytes).map((chunk) => chunk.fourcc);

describe("stripWebp", () => {
  const exif = webpChunk("EXIF", makeTiff({ make: "Cam", gps: true }));
  const full = makeWebp([vp8x(ICC | EXIF | XMP), P.iccp, P.vp8l, exif, P.xmp]);

  it("drops EXIF and XMP, clears their flags and fixes the RIFF size", () => {
    const out = stripWebp(full);
    expect(fourccs(out)).toEqual(["VP8X", "ICCP", "VP8L"]);
    expect(out).toEqual(makeWebp([vp8x(ICC), P.iccp, P.vp8l]));
    expect(u32le(out, 4)).toBe(out.length - 8);
  });

  it("keeps a minimal Orientation-only EXIF chunk and its flag when rotated", () => {
    const rotated = makeWebp([vp8x(EXIF | XMP), P.vp8l, webpChunk("EXIF", makeTiff({ orientation: 6, gps: true })), P.xmp]);
    const out = stripWebp(rotated);
    const chunks = parseWebp(out);
    expect(chunks.map((chunk) => chunk.fourcc)).toEqual(["VP8X", "VP8L", "EXIF"]);
    expect(chunks[0].data[0]).toBe(EXIF);
    expect(readOrientation(chunks[2].data)).toBe(6);
    expect(u32le(out, 4)).toBe(out.length - 8);
  });

  it("reads EXIF payloads that start with an Exif header", () => {
    const prefixed = new Uint8Array([...new TextEncoder().encode("Exif\0\0"), ...makeTiff({ orientation: 3 })]);
    const out = stripWebp(makeWebp([vp8x(EXIF), P.vp8l, webpChunk("EXIF", prefixed)]));
    expect(readOrientation(parseWebp(out)[2].data)).toBe(3);
  });

  it("leaves a simple WebP without metadata unchanged and is idempotent", () => {
    const simple = makeWebp([P.vp8l]);
    expect(stripWebp(simple)).toEqual(simple);
    const once = stripWebp(full);
    expect(stripWebp(once)).toEqual(once);
  });

  it("rejects a chunk that runs past the end of the file", () => {
    expect(() => stripWebp(full.subarray(0, full.length - 3))).toThrow();
  });
});
