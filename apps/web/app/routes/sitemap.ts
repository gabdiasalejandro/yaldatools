import { LOCALES } from "~/i18n/locales";
import { SITE_URL } from "~/i18n/meta";
import { PAGE_IDS, pathFor } from "~/i18n/pages";

// Resource route pre-rendered at build time into build/client/sitemap.xml.
export function loader() {
  const urls = PAGE_IDS.flatMap((page) =>
    LOCALES.map((locale) => {
      const alternates = LOCALES.map(
        (alt) => `    <xhtml:link rel="alternate" hreflang="${alt}" href="${SITE_URL}${pathFor(page, alt)}"/>`,
      ).join("\n");
      return `  <url>\n    <loc>${SITE_URL}${pathFor(page, locale)}</loc>\n${alternates}\n  </url>`;
    }),
  );
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}
