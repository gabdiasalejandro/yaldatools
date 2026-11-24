import { Link, useLocation } from "react-router";
import { LOCALES, LOCALE_STORAGE_KEY } from "~/i18n/locales";
import { useLocale, useMessages } from "~/i18n/messages";
import { alternatePath, pathFor } from "~/i18n/pages";
import { Clock } from "./Clock";
import { PixelIcon } from "./PixelIcon";

export function Taskbar({ task }: { task: string }) {
  const t = useMessages();
  const locale = useLocale();
  const { pathname } = useLocation();

  return (
    <footer className="raised taskbar" aria-label={t.taskbar.toolbar}>
      <Link to={pathFor("home", locale)} className="raised btn taskbar-start" aria-label={t.taskbar.startLabel}>
        <PixelIcon kind="start" size={20} />
        {t.taskbar.start}
      </Link>
      <div className="sunken taskbar-task">{task}</div>
      <div className="taskbar-spacer" />
      <Link to={pathFor("support", locale)} className="raised btn" style={{ fontWeight: 700 }}>
        <PixelIcon kind="heart" size={16} />
        {t.taskbar.support}
      </Link>
      <div className="sunken taskbar-tray">
        <nav aria-label={t.taskbar.language} className="taskbar-languages">
          {LOCALES.map((target) => (
            <Link
              key={target}
              to={alternatePath(pathname, target)}
              hrefLang={target}
              lang={target}
              className="raised btn"
              aria-current={target === locale ? "page" : undefined}
              onClick={() => localStorage.setItem(LOCALE_STORAGE_KEY, target)}
            >
              {target.toUpperCase()}
            </Link>
          ))}
        </nav>
        <Clock />
      </div>
    </footer>
  );
}
