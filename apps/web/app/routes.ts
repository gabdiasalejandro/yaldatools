import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { LOCALES } from "./i18n/locales";
import { PAGE_IDS, pathFor, type PageId } from "./i18n/pages";

// One route module per page, mounted once per language with translated slugs.
const MODULES: Record<PageId, string> = {
  home: "routes/home.tsx",
  qr: "routes/qr.tsx",
  removeBg: "routes/remove-background.tsx",
  exif: "routes/remove-exif.tsx",
  support: "routes/support.tsx",
  readme: "routes/readme.tsx",
};

export default [
  index("routes/language-redirect.tsx"),
  ...PAGE_IDS.flatMap((page) =>
    LOCALES.map((locale) => route(pathFor(page, locale).slice(1), MODULES[page], { id: `${page}-${locale}` })),
  ),
  route("sitemap.xml", "routes/sitemap.ts"),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
