import { Link } from "react-router";
import { pageMeta } from "~/i18n/meta";
import { useLocale, useMessages } from "~/i18n/messages";
import { pathFor } from "~/i18n/pages";
import { Desktop } from "~/shared/ui/Desktop";
import { MascotSlot } from "~/shared/ui/MascotSlot";
import { Window } from "~/shared/ui/Window";
import type { Route } from "./+types/remove-background";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

// Placeholder: the in-browser background remover is phase 2.
export default function RemoveBackground() {
  const t = useMessages();
  const locale = useLocale();
  return (
    <Desktop task={t.removeBg.taskLabel} centered>
      <Window title={t.removeBg.windowTitle} style={{ width: "100%", maxWidth: 560, marginTop: 24 }}>
        <div className="window-body" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <MascotSlot label={t.removeBg.mascotAlt} size={110} />
          <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="headline">{t.removeBg.headline}</p>
            <p style={{ margin: 0, lineHeight: 1.5 }}>{t.removeBg.body}</p>
            <Link to={pathFor("home", locale)} className="raised btn" style={{ alignSelf: "flex-start" }}>
              {t.removeBg.back}
            </Link>
          </div>
        </div>
      </Window>
    </Desktop>
  );
}
