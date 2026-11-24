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

  it("keeps every tag it read, for the full list", async () => {
    const jpeg = makeJpeg([exifSegment(makeTiff({ make: "Canon", orientation: 6, gps: true })), ...IMAGE]);
    const { tags, readError } = await readMetadata(jpeg);
    expect(readError).toBe(false);
    expect(tags).toMatchObject({ Make: "Canon", Orientation: 6, GPSLatitudeRef: "N" });
  });

  it("decodes UTF-8 text stored in Exif ASCII fields, as phones and Windows write it", async () => {
    const utf8 = new TextEncoder();
    const tiff = makeTiff({
      make: "Pixel 9",
      text: [
        { tag: 0x013b, bytes: utf8.encode("Ana Pérez") },
        { tag: 0x8298, bytes: utf8.encode("© Ana") },
      ],
    });
    const { summary } = await readMetadata(makeJpeg([exifSegment(tiff), ...IMAGE]));
    expect(summary.author).toBe("Ana Pérez");
    expect(summary.copyright).toBe("© Ana");
  });

  it.each([
    // exifr reports this one as an `errors` list instead of throwing.
    ["IFD0 past the end of the block", Uint8Array.of(0x49, 0x49, 0x2a, 0x00, 0xff, 0xff, 0x00, 0x00)],
    // exifr throws for this one.
    ["an unknown byte order", Uint8Array.of(0x58, 0x58, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00)],
  ])("says so when the Exif block cannot be read (%s), instead of showing an empty summary", async (_, broken) => {
    const { summary, tags, readError } = await readMetadata(makeJpeg([exifSegment(broken), ...IMAGE]));
    expect(readError).toBe(true);
    expect(tags).toEqual({});
    expect(summary).toEqual({ otherTags: 0 });
  });

  it("does not report a read error when there is simply no Exif block", async () => {
    expect((await readMetadata(makeJpeg(IMAGE))).readError).toBe(false);
  });
});
