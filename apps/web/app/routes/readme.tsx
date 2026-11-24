import { pageMeta } from "~/i18n/meta";
import { useMessages } from "~/i18n/messages";
import { Desktop } from "~/shared/ui/Desktop";
import { Window } from "~/shared/ui/Window";
import type { Route } from "./+types/readme";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function Readme() {
  const t = useMessages();
  return (
    <Desktop task={t.readme.taskLabel} centered>
      <Window title={t.readme.windowTitle} style={{ width: "100%", maxWidth: 640, marginTop: 24 }}>
        <div className="window-body sunken prose" style={{ background: "#fff", margin: 10 }}>
          <h2>{t.readme.aboutTitle}</h2>
          <p>{t.readme.about}</p>
          <h2>{t.readme.privacyTitle}</h2>
          <p>{t.readme.privacy}</p>
          <h2>{t.readme.creditsTitle}</h2>
          <ul>
            <li>
              {t.readme.creditWallpaper}{" "}
              <a href="https://fromtheasia.com/" rel="noopener" target="_blank">
                fromtheasia.com
              </a>
            </li>
            <li>{t.readme.creditLibraries}</li>
            <li>{t.readme.creditFonts}</li>
          </ul>
        </div>
      </Window>
    </Desktop>
  );
}
