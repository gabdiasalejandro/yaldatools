// Lossless PNG metadata removal: chunks are dropped or copied untouched (with their CRC).
import { ascii, concat, fromAscii, MalformedFileError, u32be, writeU32be } from "./bytes";
import { crc32 } from "./crc32";
import { exifTiff, orientationOnlyTiff, readOrientation } from "./tiff";

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Chunks that carry metadata about the photo or its author, not the picture. */
const METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

export type PngChunk = { type: string; offset: number; end: number; data: Uint8Array };

/** Splits a PNG into chunks up to IEND, checking the signature, lengths and every CRC. */
export function parsePng(bytes: Uint8Array): PngChunk[] {
  if (bytes.length < 8 || PNG_SIGNATURE.some((value, i) => bytes[i] !== value)) {
    throw new MalformedFileError("Not a PNG");
  }
  const chunks: PngChunk[] = [];
  let pos = 8;
  while (pos + 12 <= bytes.length) {
    const length = u32be(bytes, pos);
    const end = pos + 12 + length;
    if (end > bytes.length) throw new MalformedFileError(`Chunk at ${pos} runs past the end`);
    const type = ascii(bytes, pos + 4, 4);
    const data = bytes.subarray(pos + 8, pos + 8 + length);
    if (crc32([bytes.subarray(pos + 4, pos + 8), data]) !== u32be(bytes, pos + 8 + length)) {
      throw new MalformedFileError(`Bad CRC in ${type}`);
    }
    if (chunks.length === 0 && type !== "IHDR") throw new MalformedFileError("PNG must start with IHDR");
    chunks.push({ type, offset: pos, end, data });
    if (type === "IEND") return chunks;
    pos = end;
  }
  throw new MalformedFileError("PNG ends before IEND");
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  writeU32be(out, 0, data.length);
  out.set(fromAscii(type), 4);
  out.set(data, 8);
  writeU32be(out, 8 + data.length, crc32([out.subarray(4, 8 + data.length)]));
  return out;
}

/**
 * Removes eXIf, text and time chunks; keeps color (iCCP, sRGB, gAMA, cHRM) and
 * every image chunk byte for byte. A rotated image keeps an Orientation-only eXIf.
 */
export function stripPng(bytes: Uint8Array): Uint8Array {
  const chunks = parsePng(bytes);
  const exif = chunks.find((item) => item.type === "eXIf");
  const orientation = exif ? readOrientation(exifTiff(exif.data)) : 1;
  const parts: Uint8Array[] = [Uint8Array.from(PNG_SIGNATURE)];
  for (const item of chunks) {
    if (METADATA_CHUNKS.has(item.type)) continue;
    parts.push(bytes.subarray(item.offset, item.end));
    // Right after IHDR, so it always precedes the image data as the format requires.
    if (item.type === "IHDR" && orientation !== 1) parts.push(chunk("eXIf", orientationOnlyTiff(orientation)));
  }
  return concat(parts);
}
