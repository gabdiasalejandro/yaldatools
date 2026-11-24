// Minimal TIFF (Exif) reading and writing: only what is needed to keep a photo upright.

import { startsWith } from "./bytes";

const ORIENTATION_TAG = 0x0112;
const SHORT = 3;

/** EXIF Orientation (1–8) from a TIFF block; 1 when missing, invalid or unreadable. */
export function readOrientation(tiff: Uint8Array): number {
  if (tiff.length < 8) return 1;
  const little = tiff[0] === 0x49 && tiff[1] === 0x49;
  const big = tiff[0] === 0x4d && tiff[1] === 0x4d;
  if (!little && !big) return 1;
  const u16 = (at: number) => (little ? tiff[at] | (tiff[at + 1] << 8) : (tiff[at] << 8) | tiff[at + 1]);
  const u32 = (at: number) => (little ? u16(at) + u16(at + 2) * 0x10000 : u16(at) * 0x10000 + u16(at + 2));
  if (u16(2) !== 42) return 1;

  const ifd = u32(4);
  if (ifd + 2 > tiff.length) return 1;
  const count = u16(ifd);
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > tiff.length) return 1;
    if (u16(entry) !== ORIENTATION_TAG) continue;
    if (u16(entry + 2) !== SHORT || u32(entry + 4) !== 1) return 1;
    const value = u16(entry + 8);
    return value >= 1 && value <= 8 ? value : 1;
  }
  return 1;
}

/** Big-endian TIFF whose only content is IFD0 with a single Orientation entry. */
export function orientationOnlyTiff(orientation: number): Uint8Array {
  return Uint8Array.of(
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // "MM", 42, IFD0 at offset 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // Orientation, SHORT, count 1
    (orientation >> 8) & 0xff, orientation & 0xff, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, // no next IFD
  );
}

/** PNG and WebP Exif payloads are normally a bare TIFF block; some writers prefix "Exif\0\0". */
export function exifTiff(data: Uint8Array): Uint8Array {
  return startsWith(data, 0, "Exif\0\0") ? data.subarray(6) : data;
}
