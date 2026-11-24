// Entry points shared by the UI: detect the format, report what a file carries and clean it.
import { ascii, MalformedFileError, startsWith } from "./bytes";
import { jpegOrientation, parseJpeg, stripJpeg } from "./jpeg";
import { parsePng, stripPng } from "./png";
import { exifTiff, readOrientation } from "./tiff";
import { parseWebp, stripWebp } from "./webp";

export type ImageFormat = "jpeg" | "png" | "webp";

export const MIME_TYPES: Record<ImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** Format from the file's first bytes; null for anything that is not JPEG, PNG or WebP. */
export function detectFormat(bytes: Uint8Array): ImageFormat | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  return null;
}

export type CleanResult = { format: ImageFormat; bytes: Uint8Array; orientation: number };

const STRIP: Record<ImageFormat, (bytes: Uint8Array) => Uint8Array> = {
  jpeg: stripJpeg,
  png: stripPng,
  webp: stripWebp,
};

/** Removes metadata without re-encoding; throws MalformedFileError for unsupported or broken files. */
export function cleanImage(bytes: Uint8Array): CleanResult {
  const format = detectFormat(bytes);
  if (!format) throw new MalformedFileError("Unsupported format");
  const cleaned = STRIP[format](bytes);
  return { format, bytes: cleaned, orientation: inspectContainer(cleaned).orientation };
}

export type ContainerReport = {
  format: ImageFormat;
  /** Raw TIFF block holding the Exif tags, for exifr to read. */
  tiff: Uint8Array | null;
  orientation: number;
  xmp: boolean;
  /** XMP can repeat the GPS position even when Exif has none. */
  xmpGps: boolean;
  iptc: boolean;
  comment: boolean;
  /** PNG text chunks (author, description, software…), not counting XMP. */
  textChunks: number;
  time: boolean;
  icc: boolean;
};

const latin1 = (bytes: Uint8Array) => new TextDecoder("latin1").decode(bytes);
const XMP_JPEG = ["http://ns.adobe.com/xap/1.0/\0", "http://ns.adobe.com/xmp/extension/\0"];

/** Lists the metadata blocks a file carries, straight from its container structure. */
export function inspectContainer(bytes: Uint8Array): ContainerReport {
  const format = detectFormat(bytes);
  if (!format) throw new MalformedFileError("Unsupported format");
  const report: ContainerReport = {
    format,
    tiff: null,
    orientation: 1,
    xmp: false,
    xmpGps: false,
    iptc: false,
    comment: false,
    textChunks: 0,
    time: false,
    icc: false,
  };
  const foundXmp = (data: Uint8Array) => {
    report.xmp = true;
    report.xmpGps ||= /GPSLatitude|GPSLongitude/.test(latin1(data));
  };

  if (format === "jpeg") {
    const { segments } = parseJpeg(bytes);
    for (const { marker, payload } of segments) {
      if (marker === 0xe1 && startsWith(payload, 0, "Exif\0\0")) report.tiff ??= payload.subarray(6);
      else if (marker === 0xe1 && XMP_JPEG.some((id) => startsWith(payload, 0, id))) foundXmp(payload);
      else if (marker === 0xed) report.iptc = true;
      else if (marker === 0xfe) report.comment = true;
      else if (marker === 0xe2 && startsWith(payload, 0, "ICC_PROFILE\0")) report.icc = true;
    }
    report.orientation = jpegOrientation(segments);
    return report;
  }

  if (format === "png") {
    for (const { type, data } of parsePng(bytes)) {
      if (type === "eXIf") report.tiff ??= exifTiff(data);
      else if (type === "iTXt" && startsWith(data, 0, "XML:com.adobe.xmp\0")) foundXmp(data);
      else if (type === "tEXt" || type === "zTXt" || type === "iTXt") {
        report.textChunks++;
        if (/iptc/i.test(latin1(data.subarray(0, 80)).split("\0")[0])) report.iptc = true;
      } else if (type === "tIME") report.time = true;
      else if (type === "iCCP") report.icc = true;
    }
  } else {
    for (const { fourcc, data } of parseWebp(bytes)) {
      if (fourcc === "EXIF") report.tiff ??= exifTiff(data);
      else if (fourcc === "XMP ") foundXmp(data);
      else if (fourcc === "ICCP") report.icc = true;
    }
  }
  report.orientation = report.tiff ? readOrientation(report.tiff) : 1;
  return report;
}
