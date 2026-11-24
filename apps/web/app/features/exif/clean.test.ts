import { describe, expect, it } from "vitest";
import { cleanImage, detectFormat, inspectContainer } from "./clean";
import {
  JPEG_PARTS as J,
  PNG_PARTS,
  exifSegment,
  makeJpeg,
  makePng,
  makeTiff,
  makeWebp,
  pngChunk,
  vp8x,
  webpChunk,
  WEBP_PARTS,
} from "./testFiles";

const jpeg = makeJpeg([J.app0, exifSegment(makeTiff({ orientation: 6, gps: true })), J.xmp, J.iptc, J.comment, J.icc, J.dqt, J.sof, J.dht, J.scan, J.eoi]);

describe("detectFormat", () => {
  it("recognises JPEG, PNG and WebP by their bytes, not their name", () => {
    expect(detectFormat(jpeg)).toBe("jpeg");
    expect(detectFormat(makePng([PNG_PARTS.ihdr, PNG_PARTS.iend]))).toBe("png");
    expect(detectFormat(makeWebp([WEBP_PARTS.vp8l]))).toBe("webp");
  });

  it("rejects anything else", () => {
    expect(detectFormat(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
    expect(detectFormat(new Uint8Array(0))).toBeNull();
  });
});

describe("cleanImage", () => {
  it("cleans each supported format and reports the kept orientation", () => {
    const result = cleanImage(jpeg);
    expect(result.format).toBe("jpeg");
    expect(result.orientation).toBe(6);
    expect(inspectContainer(result.bytes)).toMatchObject({ xmp: false, iptc: false, comment: false, icc: true });
  });

  it("throws for non-images", () => {
    expect(() => cleanImage(new TextEncoder().encode("GIF89a"))).toThrow();
  });

  it("is idempotent for every format", () => {
    const png = makePng([PNG_PARTS.ihdr, pngChunk("eXIf", makeTiff({ orientation: 8 })), PNG_PARTS.text, PNG_PARTS.idat, PNG_PARTS.iend]);
    const webp = makeWebp([vp8x(0x0c), WEBP_PARTS.vp8l, webpChunk("EXIF", makeTiff({ gps: true })), WEBP_PARTS.xmp]);
    for (const file of [jpeg, png, webp]) {
      const once = cleanImage(file).bytes;
      expect(cleanImage(once).bytes).toEqual(once);
    }
  });
});

describe("inspectContainer", () => {
  it("finds the Exif block, XMP with GPS, IPTC, comments and ICC in a JPEG", () => {
    const report = inspectContainer(jpeg);
    expect(report).toMatchObject({ format: "jpeg", xmp: true, xmpGps: true, iptc: true, comment: true, icc: true, orientation: 6 });
    expect(report.tiff).not.toBeNull();
  });

  it("counts PNG text chunks and the WebP EXIF chunk", () => {
    const png = makePng([PNG_PARTS.ihdr, PNG_PARTS.text, PNG_PARTS.ztxt, PNG_PARTS.time, PNG_PARTS.idat, PNG_PARTS.iend]);
    expect(inspectContainer(png)).toMatchObject({ format: "png", textChunks: 2, time: true, tiff: null });
    const webp = makeWebp([vp8x(0x08), WEBP_PARTS.vp8l, webpChunk("EXIF", makeTiff({ make: "Cam" }))]);
    expect(inspectContainer(webp).tiff).not.toBeNull();
  });
});
