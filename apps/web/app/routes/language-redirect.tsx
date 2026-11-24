import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { pickLocale } from "~/i18n/detect";
import { LOCALES, LOCALE_STORAGE_KEY } from "~/i18n/locales";
import { SITE_URL } from "~/i18n/meta";
import { getMessages } from "~/i18n/messages";
import { pathFor } from "~/i18n/pages";

export function meta() {
  return [
    { title: "YaldaTools" },
    { name: "description", content: `${getMessages("es").pages.home.description} / ${getMessages("en").pages.home.description}` },
    ...LOCALES.map((locale) => ({
      tagName: "link",
      rel: "alternate",
      hrefLang: locale,
      href: `${SITE_URL}${pathFor("home", locale)}`,
    })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: `${SITE_URL}/` },
  ];
}

// The site is static, so the language is chosen in the browser: saved choice,
// then the browser languages (the same list sent as Accept-Language), then Spanish.
export default function LanguageRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const locale = pickLocale(localStorage.getItem(LOCALE_STORAGE_KEY), navigator.languages);
    navigate(pathFor("home", locale), { replace: true });
  }, [navigate]);

  return (
    <div className="desktop">
      <main className="desktop-area desktop-area--centered">
        <nav className="raised window" aria-label="Idioma / Language">
          <div className="window-body" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span>
              {getMessages("es").redirect.choose} / {getMessages("en").redirect.choose}:
            </span>
            <Link className="raised btn" to={pathFor("home", "es")} lang="es">
              Español
            </Link>
            <Link className="raised btn" to={pathFor("home", "en")} lang="en">
              English
            </Link>
          </div>
        </nav>
      </main>
    </div>
  );
}
