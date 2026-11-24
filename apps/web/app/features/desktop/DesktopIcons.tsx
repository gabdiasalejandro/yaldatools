import { Link } from "react-router";
import { useLocale, useMessages } from "~/i18n/messages";
import { pathFor } from "~/i18n/pages";
import { PixelIcon } from "~/shared/ui/PixelIcon";
import type { DesktopApp } from "./apps";

export function DesktopIcons({ apps }: { apps: readonly DesktopApp[] }) {
  const t = useMessages();
  const locale = useLocale();
  return (
    <ul className="desktop-icons" aria-label={t.desktop.programs}>
      {apps.map((app) => {
        const content = (
          <>
            <PixelIcon kind={app.icon} />
            <span className="desktop-icon-label">{t.desktop.apps[app.id].label}</span>
            {app.soon && <span className="desktop-icon-soon">{t.desktop.soon}</span>}
          </>
        );
        return (
          <li key={app.id}>
            {app.page ? (
              <Link to={pathFor(app.page, locale)} className="desktop-icon">
                {content}
              </Link>
            ) : (
              <span className="desktop-icon" aria-disabled="true">
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
