// Hand-built synthetic files for the tests: tiny, deterministic and license-free.
import { concat, fromAscii, writeU32be, writeU32le } from "./bytes";
import { crc32 } from "./crc32";

type TiffOptions = { orientation?: number; make?: string; gps?: boolean };

/** Little-endian TIFF with Make, Orientation and a GPS IFD (40° 26' 46" N, 3° 42' W), as needed. */
export function makeTiff({ orientation, make, gps }: TiffOptions = {}): Uint8Array {
  type Entry = { tag: number; type: number; count: number; value: Uint8Array | number };
  const entries: Entry[] = [];
  if (make) entries.push({ tag: 0x010f, type: 2, count: make.length + 1, value: fromAscii(`${make}\0`) });
  if (orientation !== undefined) entries.push({ tag: 0x0112, type: 3, count: 1, value: orientation });
  if (gps) entries.push({ tag: 0x8825, type: 4, count: 1, value: 0 /* patched below */ });

  const ifd0Size = 2 + entries.length * 12 + 4;
  const out: number[] = [0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0];
  const data: number[] = [];
  const dataStart = 8 + ifd0Size;
  const gpsStart = dataStart + (make && make.length + 1 > 4 ? make.length + 1 : 0);
  const le16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
  const le32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

  out.push(...le16(entries.length));
  for (const entry of entries) {
    out.push(...le16(entry.tag), ...le16(entry.type), ...le32(entry.count));
    if (entry.value instanceof Uint8Array && entry.value.length <= 4) {
      // Values of up to four bytes live inside the entry itself.
      out.push(...entry.value, ...new Array(4 - entry.value.length).fill(0));
    } else if (entry.value instanceof Uint8Array) {
      out.push(...le32(dataStart + data.length));
      data.push(...entry.value);
    } else if (entry.tag === 0x8825) {
      out.push(...le32(gpsStart));
    } else {
      out.push(...le16(entry.value), 0, 0);
    }
  }
  out.push(0, 0, 0, 0);
  out.push(...data);

  if (gps) {
    const rationals = gpsStart + 2 + 4 * 12 + 4;
    out.push(...le16(4));
    out.push(...le16(0x0001), ...le16(2), ...le32(2), 0x4e, 0, 0, 0); // GPSLatitudeRef "N"
    out.push(...le16(0x0002), ...le16(5), ...le32(3), ...le32(rationals)); // GPSLatitude
    out.push(...le16(0x0003), ...le16(2), ...le32(2), 0x57, 0, 0, 0); // GPSLongitudeRef "W"
    out.push(...le16(0x0004), ...le16(5), ...le32(3), ...le32(rationals + 24)); // GPSLongitude
    out.push(0, 0, 0, 0);
    for (const [num, den] of [[40, 1], [26, 1], [46, 1], [3, 1], [42, 1], [0, 1]]) out.push(...le32(num), ...le32(den));
  }
  return Uint8Array.from(out);
}

function segment(marker: number, payload: Uint8Array): Uint8Array {
  const length = payload.length + 2;
  return concat([Uint8Array.of(0xff, marker, length >> 8, length & 0xff), payload]);
}

export const JPEG_PARTS = {
  app0: segment(0xe0, concat([fromAscii("JFIF\0"), Uint8Array.of(1, 1, 0, 0, 1, 0, 1, 0, 0)])),
  xmp: segment(0xe1, fromAscii("http://ns.adobe.com/xap/1.0/\0<x:xmpmeta>exif:GPSLatitude</x:xmpmeta>")),
  icc: segment(0xe2, concat([fromAscii("ICC_PROFILE\0"), Uint8Array.of(1, 1), fromAscii("fake-icc-profile")])),
  mpf: segment(0xe2, fromAscii("MPF\0MM\0*")),
  iptc: segment(0xed, fromAscii("Photoshop 3.0\x008BIM\x04\x04")),
  adobe: segment(0xee, concat([fromAscii("Adobe"), Uint8Array.of(0, 100, 0, 0, 0, 0, 1)])),
  comment: segment(0xfe, fromAscii("taken at home")),
  dqt: segment(0xdb, Uint8Array.from({ length: 65 }, (_, i) => (i === 0 ? 0 : i))),
  sof: segment(0xc0, Uint8Array.of(8, 0, 2, 0, 2, 1, 1, 0x11, 0)),
  dht: segment(0xc4, Uint8Array.from({ length: 20 }, (_, i) => (i === 0 ? 0 : i < 17 ? (i === 1 ? 1 : 0) : 0))),
  /** Scan header plus entropy-coded bytes with a stuffed 0xFF00 and a restart marker. */
  scan: concat([
    segment(0xda, Uint8Array.of(1, 1, 0, 0, 63, 0)),
    Uint8Array.of(0x12, 0xff, 0x00, 0x34, 0xff, 0xd0, 0x56, 0x78),
  ]),
  eoi: Uint8Array.of(0xff, 0xd9),
};

export function exifSegment(tiff: Uint8Array): Uint8Array {
  return segment(0xe1, concat([fromAscii("Exif\0\0"), tiff]));
}

export function makeJpeg(parts: readonly Uint8Array[]): Uint8Array {
  return concat([Uint8Array.of(0xff, 0xd8), ...parts]);
}

export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const head = new Uint8Array(8);
  writeU32be(head, 0, data.length);
  head.set(fromAscii(type), 4);
  const tail = new Uint8Array(4);
  writeU32be(tail, 0, crc32([head.subarray(4), data]));
  return concat([head, data, tail]);
}

export const PNG_SIGNATURE = Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

export function makePng(chunks: readonly Uint8Array[]): Uint8Array {
  return concat([PNG_SIGNATURE, ...chunks]);
}

export const PNG_PARTS = {
  ihdr: pngChunk("IHDR", Uint8Array.of(0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0)),
  iccp: pngChunk("iCCP", fromAscii("icc\0\0fake")),
  gama: pngChunk("gAMA", Uint8Array.of(0, 0, 0xb1, 0x8f)),
  text: pngChunk("tEXt", fromAscii("Author\0Someone")),
  ztxt: pngChunk("zTXt", fromAscii("Comment\0\0x")),
  itxt: pngChunk("iTXt", fromAscii("XML:com.adobe.xmp\0\0\0\0\0<x/>")),
  time: pngChunk("tIME", Uint8Array.of(7, 0xe8, 1, 2, 3, 4, 5)),
  idat: pngChunk("IDAT", Uint8Array.of(0x78, 0x9c, 0x63, 0x60, 0x60, 0x60, 0, 0, 0, 4, 0, 1)),
  iend: pngChunk("IEND", new Uint8Array(0)),
};

export function webpChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const head = new Uint8Array(8);
  head.set(fromAscii(fourcc), 0);
  writeU32le(head, 4, data.length);
  return concat([head, data, data.length % 2 ? Uint8Array.of(0) : new Uint8Array(0)]);
}

/** VP8X header chunk with the given flags and a 1×1 canvas. */
export function vp8x(flags: number): Uint8Array {
  return webpChunk("VP8X", Uint8Array.of(flags, 0, 0, 0, 0, 0, 0, 0, 0, 0));
}

export const WEBP_PARTS = {
  iccp: webpChunk("ICCP", fromAscii("fake-icc")),
  /** Odd length on purpose, to exercise the padding byte. */
  vp8l: webpChunk("VP8L", Uint8Array.of(0x2f, 0, 0, 0, 0, 0x07, 0x10, 0x11, 0x88)),
  xmp: webpChunk("XMP ", fromAscii("<x:xmpmeta/>")),
};

export function makeWebp(chunks: readonly Uint8Array[]): Uint8Array {
  const body = concat([fromAscii("WEBP"), ...chunks]);
  const head = new Uint8Array(8);
  head.set(fromAscii("RIFF"), 0);
  writeU32le(head, 4, body.length);
  return concat([head, body]);
}
