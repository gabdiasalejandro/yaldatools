// Human-readable file sizes, shared by the file tools.
import type { Locale } from "~/i18n/locales";

/** 1536 → "1.5 KB" (en) / "1,5 KB" (es). */
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
