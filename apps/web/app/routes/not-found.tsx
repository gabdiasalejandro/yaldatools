import { Link } from "react-router";
import { pageMeta } from "~/i18n/meta";
import { useLocale, useMessages } from "~/i18n/messages";
import { pathFor } from "~/i18n/pages";
import { Desktop } from "~/shared/ui/Desktop";
import { MascotSlot } from "~/shared/ui/MascotSlot";
import { Window } from "~/shared/ui/Window";
import type { Route } from "./+types/not-found";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export function NotFoundPage() {
  const t = useMessages();
  const locale = useLocale();
  return (
    <Desktop task={t.notFound.windowTitle} centered>
      <Window title={t.notFound.windowTitle} style={{ width: "100%", maxWidth: 520, marginTop: 24 }}>
        <div className="window-body" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <MascotSlot label={t.notFound.mascotAlt} size={120} />
          <div style={{ flex: "1 1 220px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="headline" style={{ fontSize: 22 }}>
              {t.notFound.headline}
            </p>
            <p style={{ margin: 0 }}>{t.notFound.body}</p>
            <Link to={pathFor("home", locale)} className="raised btn btn-primary" style={{ alignSelf: "flex-start" }}>
              {t.notFound.back}
            </Link>
          </div>
        </div>
      </Window>
    </Desktop>
  );
}

export default NotFoundPage;
