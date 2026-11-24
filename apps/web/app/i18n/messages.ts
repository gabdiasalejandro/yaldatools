import { useLocation } from "react-router";
import en from "./messages/en.json";
import es from "./messages/es.json";
import type { Locale } from "./locales";
import { localeFromPath } from "./pages";

export type Messages = typeof es;

// Typing `en` as Messages makes the compiler reject a missing or misspelled key.
const english: Messages = en;
const MESSAGES: Record<Locale, Messages> = { es, en: english };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Language of the current page, taken from the first URL segment. */
export function useLocale(): Locale {
  return localeFromPath(useLocation().pathname);
}

export function useMessages(): Messages {
  return getMessages(useLocale());
}
