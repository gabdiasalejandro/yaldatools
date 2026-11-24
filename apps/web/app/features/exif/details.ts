// Everything a photo's Exif block holds, in readable form: grouped highlights and the full list.
import type { Locale } from "~/i18n/locales";
import { format, type Messages } from "~/i18n/messages";
import { formatBytes } from "~/shared/format/bytes";
import { formatDate, formatLatitude, formatLongitude } from "./display";
import type { Tags } from "./summary";

export type DetailLabels = Messages["exif"]["details"];
export type DetailRow = { label: string; value: string };
export type DetailGroupId = "shooting" | "image" | "dates" | "location" | "identity";
export type DetailGroup = { id: DetailGroupId; rows: DetailRow[] };
export type RawEntry = { key: string; text: string; title?: string };

const MAX_TEXT = 120;
const SHORT_BYTES = 8;
const CAMERA_SERIALS = ["SerialNumber", "BodySerialNumber", "CameraSerialNumber", "InternalSerialNumber"];

const decimal = (value: number, locale: Locale, digits = 4) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: digits, useGrouping: false }).format(value);
const finite = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const firstNumber = (value: unknown): number | undefined =>
  finite(value) ?? (ArrayBuffer.isView(value) || Array.isArray(value) ? finite(Array.from(value as ArrayLike<number>)[0]) : undefined);
const isDate = (value: unknown): value is Date => value instanceof Date && !Number.isNaN(value.getTime());

/** 0.004 → "1/250 s"; 2.5 → "2,5 s" (es). */
export function formatExposureTime(seconds: number, locale: Locale): string {
  if (seconds > 0 && seconds < 1) return `1/${Math.round(1 / seconds)} s`;
  return `${decimal(seconds, locale, 1)} s`;
}

/** 2.8 → "f/2.8", written the photographic way in every language. */
export function formatAperture(fNumber: number): string {
  return `f/${Math.round(fNumber * 10) / 10}`;
}

/** Joins make and model the way the summary does for cameras: "Canon" + "RF50mm" → "Canon RF50mm". */
function joinMakeModel(make: string | undefined, model: string | undefined): string | undefined {
  if (make && model) return model.startsWith(make) ? model : `${make} ${model}`;
  return model ?? make;
}

function codeLabel(value: unknown, labels: Record<string, string>): string | undefined {
  const code = finite(value);
  if (code === undefined) return text(value);
  return labels[String(code)] ?? String(code);
}

const pad = (value: number) => String(Math.floor(value)).padStart(2, "0");

function gpsTime(tags: Tags): string | undefined {
  const date = text(tags.GPSDateStamp)?.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const stamp = tags.GPSTimeStamp;
  const time = Array.isArray(stamp) && stamp.every((part) => finite(part) !== undefined)
    ? (stamp as number[]).map(pad).join(":")
    : text(stamp);
  if (!date && !time) return undefined;
  return `${[date, time].filter(Boolean).join(" ")}${time ? " UTC" : ""}`;
}

/** The technical data people look for, grouped and described in the page language. */
export function buildDetailGroups(tags: Tags, locale: Locale, labels: DetailLabels): DetailGroup[] {
  const f = labels.fields;
  const groups: DetailGroup[] = [];
  const add = (id: DetailGroupId, entries: [string, string | undefined][]) => {
    const rows = entries.flatMap(([label, value]) => (value ? [{ label, value }] : []));
    if (rows.length > 0) groups.push({ id, rows });
  };

  const exposure = finite(tags.ExposureTime);
  const fNumber = finite(tags.FNumber);
  const iso = firstNumber(tags.ISO);
  const focal = finite(tags.FocalLength);
  const focal35 = finite(tags.FocalLengthIn35mmFormat);
  const flash = finite(tags.Flash);
  add("shooting", [
    [f.exposure, exposure !== undefined ? formatExposureTime(exposure, locale) : undefined],
    [f.aperture, fNumber !== undefined ? formatAperture(fNumber) : undefined],
    [f.iso, iso !== undefined ? `ISO ${iso}` : undefined],
    [
      f.focalLength,
      focal !== undefined
        ? `${decimal(focal, locale, 1)} mm${focal35 ? ` (${format(labels.focal35, { value: decimal(focal35, locale, 1) })})` : ""}`
        : undefined,
    ],
    [f.lens, joinMakeModel(text(tags.LensMake), text(tags.LensModel))],
    [f.flash, flash !== undefined ? (flash & 1 ? labels.flash.fired : labels.flash.notFired) : text(tags.Flash)],
    [f.whiteBalance, codeLabel(tags.WhiteBalance, labels.whiteBalance)],
    [f.exposureMode, codeLabel(tags.ExposureMode, labels.exposureMode)],
  ]);

  const width = finite(tags.ExifImageWidth) ?? finite(tags.PixelXDimension) ?? finite(tags.ImageWidth);
  const height = finite(tags.ExifImageHeight) ?? finite(tags.PixelYDimension) ?? finite(tags.ImageHeight);
  add("image", [
    [f.dimensions, width !== undefined && height !== undefined ? `${width} × ${height} px` : undefined],
    [f.orientation, codeLabel(tags.Orientation, labels.orientation)],
  ]);

  const date = (value: unknown) => (isDate(value) ? formatDate(value, locale) : text(value) && formatDate(text(value)!, locale));
  add("dates", [
    [f.dateOriginal, date(tags.DateTimeOriginal)],
    [f.dateDigitized, date(tags.CreateDate)],
    [f.dateModified, date(tags.ModifyDate)],
  ]);

  const latitude = finite(tags.latitude);
  const longitude = finite(tags.longitude);
  const altitude = finite(tags.GPSAltitude);
  const belowSea = firstNumber(tags.GPSAltitudeRef) === 1;
  const direction = finite(tags.GPSImgDirection);
  add("location", [
    [f.latitude, latitude !== undefined ? formatLatitude(latitude) : undefined],
    [f.longitude, longitude !== undefined ? formatLongitude(longitude) : undefined],
    [f.altitude, altitude !== undefined ? `${decimal(belowSea ? -altitude : altitude, locale, 1)} m` : undefined],
    [f.gpsTime, gpsTime(tags)],
    [f.direction, direction !== undefined ? `${decimal(direction, locale, 1)}°` : undefined],
  ]);

  const cameraSerial = CAMERA_SERIALS.map((key) => text(tags[key])).find(Boolean);
  add("identity", [
    [f.cameraSerial, cameraSerial],
    [f.lensSerial, text(tags.LensSerialNumber)],
  ]);
  return groups;
}

/** Exif UserComment: an 8-byte character-code prefix, then the text. */
export function decodeUserComment(bytes: Uint8Array): string | undefined {
  if (bytes.length < 8) return undefined;
  const prefix = String.fromCharCode(...bytes.subarray(0, 8)).replace(/\0+$/, "");
  const body = bytes.subarray(8);
  let decoded: string;
  if (prefix === "ASCII" || prefix === "") {
    decoded = new TextDecoder("utf-8").decode(body);
  } else if (prefix === "UNICODE") {
    // The byte order is not stated; ASCII-range text tells it apart by where the zero bytes are.
    const evenZeros = body.filter((byte, i) => i % 2 === 0 && byte === 0).length;
    const oddZeros = body.filter((byte, i) => i % 2 === 1 && byte === 0).length;
    decoded = new TextDecoder(evenZeros > oddZeros ? "utf-16be" : "utf-16le").decode(body);
  } else {
    return undefined;
  }
  return text(decoded.replace(/\0/g, ""));
}

function binary(bytes: number, locale: Locale, labels: DetailLabels): string {
  return format(labels.binary, { size: formatBytes(bytes, locale) });
}

function formatScalar(value: unknown, locale: Locale, labels: DetailLabels): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (isDate(value)) return formatDate(value, locale);
  if (typeof value === "number") return Number.isFinite(value) ? decimal(value, locale) : String(value);
  if (typeof value === "string") return text(value) && formatDate(text(value)!, locale);
  if (typeof value === "boolean" || typeof value === "bigint") return String(value);
  if (ArrayBuffer.isView(value)) {
    const items = value instanceof DataView ? [] : Array.from(value as unknown as ArrayLike<number>);
    if (value instanceof Uint8Array && items.length > SHORT_BYTES) return binary(value.byteLength, locale, labels);
    if (items.length === 0 || items.length > SHORT_BYTES * 2) return binary(value.byteLength, locale, labels);
    return items.map((item) => formatScalar(item, locale, labels)).join(", ");
  }
  if (value instanceof ArrayBuffer) return binary(value.byteLength, locale, labels);
  if (Array.isArray(value)) {
    const parts = value.map((item) => formatScalar(item, locale, labels)).filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : undefined;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** One tag's value as text: dates in the page locale, binary data only by its size, long text cut short. */
export function formatTagValue(
  value: unknown,
  locale: Locale,
  labels: DetailLabels,
): { text: string; title?: string } | undefined {
  const formatted = formatScalar(value, locale, labels);
  if (!formatted) return undefined;
  if (formatted.length <= MAX_TEXT) return { text: formatted };
  return { text: `${formatted.slice(0, MAX_TEXT - 1)}…`, title: formatted };
}

const KEY_NAMES: Record<string, string> = { makerNote: "MakerNote", userComment: "UserComment" };

/** Every tag exifr returned, in its order. The maker note is shown only by its size. */
export function buildRawList(tags: Tags, locale: Locale, labels: DetailLabels): RawEntry[] {
  const entries: RawEntry[] = [];
  for (const [rawKey, value] of Object.entries(tags)) {
    const key = KEY_NAMES[rawKey] ?? rawKey;
    let formatted: { text: string; title?: string } | undefined;
    if (key === "MakerNote") {
      const size = ArrayBuffer.isView(value) || value instanceof ArrayBuffer ? value.byteLength : 0;
      formatted = { text: binary(size, locale, labels) };
    } else if (key === "UserComment" && value instanceof Uint8Array) {
      const comment = decodeUserComment(value);
      formatted = comment ? formatTagValue(comment, locale, labels) : { text: binary(value.byteLength, locale, labels) };
    } else {
      formatted = formatTagValue(value, locale, labels);
    }
    if (formatted) entries.push({ key, ...formatted });
  }
  return entries;
}
