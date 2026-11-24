import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

/**
 * Picks the starting language: the saved manual choice wins, then the first
 * browser language that we support, then Spanish.
 */
export function pickLocale(stored: string | null, preferred: readonly string[]): Locale {
  if (isLocale(stored)) return stored;
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
