import { describe, expect, it } from "vitest";
import { concat } from "./bytes";
import { parseJpeg, stripJpeg } from "./jpeg";
import { JPEG_PARTS as P, exifSegment, makeJpeg, makeTiff } from "./testFiles";
import { readOrientation } from "./tiff";

const IMAGE_PARTS = [P.dqt, P.sof, P.dht, P.scan, P.eoi];
const imageBytes = concat(IMAGE_PARTS);
const markers = (bytes: Uint8Array) => parseJpeg(bytes).segments.map((segment) => segment.marker);

/** Everything from the first table to the end: the compressed picture itself. */
function pictureOf(bytes: Uint8Array): Uint8Array {
  const dqt = parseJpeg(bytes).segments.find((segment) => segment.marker === 0xdb);
  return bytes.subarray(dqt!.offset);
}

describe("stripJpeg", () => {
  const full = makeJpeg([
    P.app0,
    exifSegment(makeTiff({ make: "Cam", gps: true, orientation: 1 })),
    P.xmp,
    P.icc,
    P.mpf,
    P.iptc,
    P.adobe,
    P.comment,
    ...IMAGE_PARTS,
  ]);

  it("keeps only JFIF, the ICC profile and Adobe; the picture bytes are identical", () => {
    const out = stripJpeg(full);
    expect(markers(out)).toEqual([0xe0, 0xe2, 0xee, 0xdb, 0xc0, 0xc4, 0xda]);
    expect(out).toEqual(makeJpeg([P.app0, P.icc, P.adobe, ...IMAGE_PARTS]));
    expect(pictureOf(out)).toEqual(imageBytes);
  });

  it("keeps a minimal Orientation-only Exif when the photo was rotated", () => {
    const rotated = makeJpeg([P.app0, exifSegment(makeTiff({ make: "Cam", gps: true, orientation: 6 })), P.xmp, ...IMAGE_PARTS]);
    const out = stripJpeg(rotated);
    const { segments } = parseJpeg(out);
    expect(segments.map((segment) => segment.marker)).toEqual([0xe0, 0xe1, 0xdb, 0xc0, 0xc4, 0xda]);
    const app1 = segments[1].payload;
    expect(new TextDecoder().decode(app1.subarray(0, 6))).toBe("Exif\0\0");
    expect(readOrientation(app1.subarray(6))).toBe(6);
    expect(app1.length).toBe(6 + 26);
    expect(pictureOf(out)).toEqual(imageBytes);
  });

  it("puts the Orientation Exif right after SOI when there is no JFIF header", () => {
    const out = stripJpeg(makeJpeg([exifSegment(makeTiff({ orientation: 8 })), ...IMAGE_PARTS]));
    expect(markers(out)).toEqual([0xe1, 0xdb, 0xc0, 0xc4, 0xda]);
  });

  it("drops data after the end-of-image marker", () => {
    const out = stripJpeg(concat([full, Uint8Array.of(1, 2, 3)]));
    expect([...out.subarray(-2)]).toEqual([0xff, 0xd9]);
  });

  it("drops comments placed between progressive scans but keeps the tables", () => {
    const progressive = makeJpeg([P.dqt, P.sof, P.dht, P.scan, P.comment, P.dht, P.scan, P.eoi]);
    expect(stripJpeg(progressive)).toEqual(makeJpeg([P.dqt, P.sof, P.dht, P.scan, P.dht, P.scan, P.eoi]));
  });

  it("is idempotent", () => {
    const rotated = makeJpeg([P.app0, exifSegment(makeTiff({ orientation: 6 })), P.comment, ...IMAGE_PARTS]);
    const once = stripJpeg(rotated);
    expect(stripJpeg(once)).toEqual(once);
  });

  it("rejects files that are not a complete JPEG", () => {
    expect(() => stripJpeg(Uint8Array.of(0xff, 0xd8, 0xff))).toThrow();
    expect(() => stripJpeg(makeJpeg([P.app0, P.dqt]))).toThrow();
  });
});
