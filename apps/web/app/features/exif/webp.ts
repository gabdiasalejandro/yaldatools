// Lossless WebP metadata removal: RIFF chunks are dropped or copied, the bitstream is never touched.
import { ascii, concat, fromAscii, MalformedFileError, u32le, writeU32le } from "./bytes";
import { exifTiff, orientationOnlyTiff, readOrientation } from "./tiff";

/** Feature bits in the first byte of the VP8X chunk. */
export const VP8X_FLAGS = { icc: 0x20, alpha: 0x10, exif: 0x08, xmp: 0x04, animation: 0x02 } as const;

export type WebpChunk = { fourcc: string; offset: number; end: number; data: Uint8Array };

/** Splits a WebP into its RIFF chunks, checking that every size fits inside the file. */
export function parseWebp(bytes: Uint8Array): WebpChunk[] {
  if (bytes.length < 20 || ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") {
    throw new MalformedFileError("Not a WebP");
  }
  const riffEnd = 8 + u32le(bytes, 4);
  if (riffEnd > bytes.length) throw new MalformedFileError("RIFF size runs past the end");
  const chunks: WebpChunk[] = [];
  let pos = 12;
  while (pos + 8 <= riffEnd) {
    const size = u32le(bytes, pos + 4);
    const end = pos + 8 + size + (size % 2);
    if (pos + 8 + size > riffEnd) throw new MalformedFileError(`Chunk at ${pos} runs past the end`);
    chunks.push({ fourcc: ascii(bytes, pos, 4), offset: pos, end: Math.min(end, riffEnd), data: bytes.subarray(pos + 8, pos + 8 + size) });
    pos = end;
  }
  if (chunks.length === 0) throw new MalformedFileError("WebP without chunks");
  return chunks;
}

function chunk(fourcc: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(8 + data.length + (data.length % 2));
  out.set(fromAscii(fourcc), 0);
  writeU32le(out, 4, data.length);
  out.set(data, 8);
  return out;
}

/**
 * Removes the EXIF and XMP chunks and clears their VP8X flags; keeps ICCP and
 * the image data byte for byte. A rotated image keeps an Orientation-only EXIF.
 */
export function stripWebp(bytes: Uint8Array): Uint8Array {
  const chunks = parseWebp(bytes);
  const exif = chunks.find((item) => item.fourcc === "EXIF");
  const hasVp8x = chunks[0].fourcc === "VP8X";
  // EXIF is only allowed in the extended format, which starts with VP8X.
  const orientation = exif && hasVp8x ? readOrientation(exifTiff(exif.data)) : 1;

  const parts: Uint8Array[] = [];
  for (const item of chunks) {
    if (item.fourcc === "EXIF" || item.fourcc === "XMP ") continue;
    const raw = bytes.slice(item.offset, item.end);
    if (item.fourcc === "VP8X") {
      raw[8] &= ~(VP8X_FLAGS.exif | VP8X_FLAGS.xmp);
      if (orientation !== 1) raw[8] |= VP8X_FLAGS.exif;
    }
    parts.push(raw);
  }
  // EXIF goes after the image data, as the container layout specifies.
  if (orientation !== 1) parts.push(chunk("EXIF", orientationOnlyTiff(orientation)));

  const body = concat([fromAscii("WEBP"), ...parts]);
  const head = new Uint8Array(8);
  head.set(fromAscii("RIFF"), 0);
  writeU32le(head, 4, body.length);
  return concat([head, body]);
}
