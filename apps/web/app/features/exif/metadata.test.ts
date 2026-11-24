import { describe, expect, it } from "vitest";
import { readMetadata } from "./metadata";
import { JPEG_PARTS as J, exifSegment, makeJpeg, makeTiff, makeWebp, vp8x, webpChunk, WEBP_PARTS } from "./testFiles";

const IMAGE = [J.dqt, J.sof, J.dht, J.scan, J.eoi];

describe("readMetadata", () => {
  it("reads the camera and GPS position from a JPEG's Exif block", async () => {
    const jpeg = makeJpeg([J.app0, exifSegment(makeTiff({ make: "Canon", orientation: 6, gps: true })), ...IMAGE]);
    const { report, summary } = await readMetadata(jpeg);
    expect(report.format).toBe("jpeg");
    expect(summary.camera).toBe("Canon");
    expect(summary.gps?.latitude).toBeCloseTo(40.446, 3);
    expect(summary.gps?.longitude).toBeCloseTo(-3.7, 3);
  });

  it("reads Exif from WebP, which exifr cannot open by itself", async () => {
    const webp = makeWebp([vp8x(0x08), WEBP_PARTS.vp8l, webpChunk("EXIF", makeTiff({ make: "Pixel 9" }))]);
    expect((await readMetadata(webp)).summary.camera).toBe("Pixel 9");
  });

  it("flags a GPS position found only in XMP", async () => {
    const { summary } = await readMetadata(makeJpeg([J.xmp, ...IMAGE]));
    expect(summary.gps).toEqual({ latitude: null, longitude: null });
  });

  it("reports nothing for a clean file", async () => {
    const { summary } = await readMetadata(makeJpeg(IMAGE));
    expect(summary).toEqual({ otherTags: 0 });
  });
});
