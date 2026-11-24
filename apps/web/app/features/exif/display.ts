// Formatting for what the EXIF remover shows on screen.
import type { Locale } from "~/i18n/locales";
import { formatBytes } from "~/shared/format/bytes";

// Kept here so existing imports of the EXIF tool keep working.
export { formatBytes };

export function formatCoordinates(latitude: number, longitude: number): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(5)}° ${value >= 0 ? positive : negative}`;
  return `${part(latitude, "N", "S")}, ${part(longitude, "E", "W")}`;
}


/** Exif dates come as Date objects, or as "YYYY:MM:DD hh:mm:ss" when exifr cannot parse them. */
export function formatDate(value: Date | string, locale: Locale): string {
  if (value instanceof Date) return value.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  return value.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
}
