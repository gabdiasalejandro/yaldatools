// Formatting for what the EXIF remover shows on screen.
import type { Locale } from "~/i18n/locales";

export function formatCoordinates(latitude: number, longitude: number): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(5)}° ${value >= 0 ? positive : negative}`;
  return `${part(latitude, "N", "S")}, ${part(longitude, "E", "W")}`;
}

export function formatBytes(bytes: number, locale: Locale): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);
  return `${number} ${units[unit]}`;
}

/** Exif dates come as Date objects, or as "YYYY:MM:DD hh:mm:ss" when exifr cannot parse them. */
export function formatDate(value: Date | string, locale: Locale): string {
  if (value instanceof Date) return value.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  return value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
}
