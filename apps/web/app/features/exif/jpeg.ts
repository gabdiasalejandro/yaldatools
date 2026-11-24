// Lossless JPEG metadata removal: segments are dropped or copied, the compressed picture is never touched.
import { concat, fromAscii, MalformedFileError, startsWith, u16be } from "./bytes";
import { orientationOnlyTiff, readOrientation } from "./tiff";

const SOI = 0xd8;
const EOI = 0xd9;
const SOS = 0xda;
const COM = 0xfe;
const APP0 = 0xe0;
const APP1 = 0xe1;
const APP2 = 0xe2;
const APP14 = 0xee;
const APP15 = 0xef;

export type JpegSegment = {
  marker: number;
  /** Position of the 0xFF that starts the marker. */
  offset: number;
  /** End (exclusive); for a scan it includes the entropy-coded data that follows. */
  end: number;
  /** Segment content after the length field. */
  payload: Uint8Array;
};

const isRestart = (marker: number) => marker >= 0xd0 && marker <= 0xd7;
const isStandalone = (marker: number) => isRestart(marker) || marker === 0x01;

/** Splits a JPEG into segments up to EOI; throws when the structure is broken or incomplete. */
export function parseJpeg(bytes: Uint8Array): { segments: JpegSegment[]; end: number } {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== SOI) throw new MalformedFileError("Not a JPEG");
  const segments: JpegSegment[] = [];
  let pos = 2;
  while (pos + 1 < bytes.length) {
    if (bytes[pos] !== 0xff) throw new MalformedFileError(`Expected a marker at ${pos}`);
    while (bytes[pos + 1] === 0xff) pos++; // fill bytes
    if (pos + 1 >= bytes.length) break;
    const marker = bytes[pos + 1];
    if (marker === EOI) {
      if (!segments.some((segment) => segment.marker === SOS)) throw new MalformedFileError("JPEG without image data");
      return { segments, end: pos + 2 };
    }
    if (isStandalone(marker)) {
      segments.push({ marker, offset: pos, end: pos + 2, payload: new Uint8Array(0) });
      pos += 2;
      continue;
    }
    if (pos + 4 > bytes.length) break;
    const length = u16be(bytes, pos + 2);
    let end = pos + 2 + length;
    if (length < 2 || end > bytes.length) throw new MalformedFileError(`Segment at ${pos} runs past the end`);
    const payload = bytes.subarray(pos + 4, end);
    if (marker === SOS) end = skipEntropyData(bytes, end);
    segments.push({ marker, offset: pos, end, payload });
    pos = end;
  }
  throw new MalformedFileError("JPEG ends before EOI");
}

/** Entropy-coded data ends at the first marker that is neither a stuffed 0x00 nor a restart. */
function skipEntropyData(bytes: Uint8Array, from: number): number {
  let i = from;
  while (i + 1 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const next = bytes[i + 1];
    if (next === 0x00 || isRestart(next)) i += 2;
    else if (next === 0xff) i++;
    else return i;
  }
  throw new MalformedFileError("Scan data ends before EOI");
}

const isExif = (segment: JpegSegment) => segment.marker === APP1 && startsWith(segment.payload, 0, "Exif\0\0");

/** Orientation stored in the JPEG's Exif block, or 1. */
export function jpegOrientation(segments: readonly JpegSegment[]): number {
  const exif = segments.find(isExif);
  return exif ? readOrientation(exif.payload.subarray(6)) : 1;
}

function keep(segment: JpegSegment): boolean {
  const { marker, payload } = segment;
  if (marker === COM) return false;
  if (marker < APP0 || marker > APP15) return true;
  if (marker === APP0) return startsWith(payload, 0, "JFIF\0");
  if (marker === APP2) return startsWith(payload, 0, "ICC_PROFILE\0");
  if (marker === APP14) return startsWith(payload, 0, "Adobe");
  return false;
}

function orientationSegment(orientation: number): Uint8Array {
  const payload = concat([fromAscii("Exif\0\0"), orientationOnlyTiff(orientation)]);
  const length = payload.length + 2;
  return concat([Uint8Array.of(0xff, APP1, length >> 8, length & 0xff), payload]);
}

/**
 * Removes Exif, XMP, IPTC, comments and other APPn blocks; keeps JFIF, the ICC
 * profile, Adobe color information and every image segment byte for byte.
 * Anything after EOI (trailers, appended previews) is dropped too.
 */
export function stripJpeg(bytes: Uint8Array): Uint8Array {
  const { segments } = parseJpeg(bytes);
  const orientation = jpegOrientation(segments);
  const parts = segments.filter(keep).map((segment) => bytes.subarray(segment.offset, segment.end));
  if (orientation !== 1) {
    const afterJfif = segments.filter(keep)[0]?.marker === APP0 ? 1 : 0;
    parts.splice(afterJfif, 0, orientationSegment(orientation));
  }
  return concat([Uint8Array.of(0xff, SOI), ...parts, Uint8Array.of(0xff, EOI)]);
}
