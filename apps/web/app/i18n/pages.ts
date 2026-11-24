import { DEFAULT_LOCALE, LOCALES, isLocale, type Locale } from "./locales";

export const PAGE_IDS = ["home", "qr", "removeBg", "exif", "support", "readme"] as const;
export type PageId = (typeof PAGE_IDS)[number];

// Slugs are translated because they are what people search for.
const PATHS: Record<PageId, Record<Locale, string>> = {
  home: { es: "/es", en: "/en" },
  qr: { es: "/es/qr", en: "/en/qr-code" },
  removeBg: { es: "/es/quitar-fondo", en: "/en/remove-background" },
  exif: { es: "/es/quitar-exif", en: "/en/remove-exif" },
  support: { es: "/es/apoyar", en: "/en/support" },
  readme: { es: "/es/leeme", en: "/en/readme" },
};

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

export function pathFor(page: PageId, locale: Locale): string {
  return PATHS[page][locale];
}

export function findPage(pathname: string): { page: PageId; locale: Locale } | null {
  const path = normalize(pathname);
  for (const page of PAGE_IDS) {
    for (const locale of LOCALES) {
      if (PATHS[page][locale] === path) return { page, locale };
    }
  }
  return null;
}

/** Same page in another language; unknown pages go to that language's home. */
export function alternatePath(pathname: string, target: Locale): string {
  const found = findPage(pathname);
  return pathFor(found?.page ?? "home", target);
}

export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function prerenderPaths(): string[] {
  return PAGE_IDS.flatMap((page) => LOCALES.map((locale) => PATHS[page][locale]));
}
