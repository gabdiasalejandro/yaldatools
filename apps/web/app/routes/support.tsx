import { SUPPORT_URL } from "~/config";
import { pageMeta } from "~/i18n/meta";
import { useMessages } from "~/i18n/messages";
import { Desktop } from "~/shared/ui/Desktop";
import { MascotSlot } from "~/shared/ui/MascotSlot";
import { Window } from "~/shared/ui/Window";
import type { Route } from "./+types/support";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function Support() {
  const t = useMessages();
  return (
    <Desktop task={t.support.taskLabel} centered>
      <Window title={t.support.windowTitle} style={{ width: "100%", maxWidth: 640, marginTop: 24 }}>
        <div className="window-body" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div className="prose" style={{ flex: "999 1 300px", minWidth: 0 }}>
            <p className="headline" style={{ marginBottom: 10 }}>
              {t.support.headline}
            </p>
            <p>{t.support.body}</p>
            <h2>{t.support.spendTitle}</h2>
            <ul>
              {t.support.spend.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <h2>{t.support.nextTitle}</h2>
            <ul>
              {t.support.next.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {SUPPORT_URL ? (
              <a href={SUPPORT_URL} className="raised btn btn-primary" rel="noopener" target="_blank">
                {t.support.donate}
              </a>
            ) : (
              <p className="sunken tooltip">{t.support.notYet}</p>
            )}
          </div>
          <MascotSlot label={t.support.mascotAlt} size={96} />
        </div>
      </Window>
    </Desktop>
  );
}
