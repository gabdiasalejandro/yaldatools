import { LOCALES, type Locale } from "./locales";
import { getMessages } from "./messages";
import { alternatePath, findPage, localeFromPath, type PageId } from "./pages";

export const SITE_URL = "https://tools.yaldapika.com";

type MetaDescriptor = Record<string, string>;
type MetaPage = PageId | "notFound";

/**
 * Title, description, Open Graph and hreflang links for a page, so each page
 * and language is indexed on its own.
 */
export function pageMeta(pathname: string): MetaDescriptor[] {
  const found = findPage(pathname);
  const locale: Locale = found?.locale ?? localeFromPath(pathname);
  const page: MetaPage = found?.page ?? "notFound";
  const { title, description } = getMessages(locale).pages[page];

  const tags: MetaDescriptor[] = [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:locale", content: locale === "es" ? "es_ES" : "en_US" },
  ];
  if (!found) return [...tags, { name: "robots", content: "noindex" }];

  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    ...tags,
    { property: "og:url", content: url(pathname) },
    { tagName: "link", rel: "canonical", href: url(alternatePath(pathname, locale)) },
    ...LOCALES.map((alt) => ({
      tagName: "link",
      rel: "alternate",
      hrefLang: alt,
      href: url(alternatePath(pathname, alt)),
    })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: url("/") },
  ];
}
