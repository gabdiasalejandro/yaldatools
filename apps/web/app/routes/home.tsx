import { useState } from "react";
import { useNavigate } from "react-router";
import { DESKTOP_APPS, searchApps, toolStats } from "~/features/desktop/apps";
import { DesktopIcons } from "~/features/desktop/DesktopIcons";
import { WelcomeWindow } from "~/features/desktop/WelcomeWindow";
import { pageMeta } from "~/i18n/meta";
import { useLocale, useMessages } from "~/i18n/messages";
import { pathFor } from "~/i18n/pages";
import { Desktop } from "~/shared/ui/Desktop";
import type { Route } from "./+types/home";

export const meta: Route.MetaFunction = ({ location }) => pageMeta(location.pathname);

export default function Home() {
  const t = useMessages();
  const locale = useLocale();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const results = searchApps(DESKTOP_APPS, t.desktop.apps, query);

  // Opening on search only makes sense when exactly one program can be opened.
  const openSingleResult = () => {
    const openable = results.filter((app) => app.page);
    if (openable.length === 1 && openable[0].page) navigate(pathFor(openable[0].page, locale));
  };

  return (
    <Desktop task={t.home.windowTitle}>
      <DesktopIcons apps={results} />
      <WelcomeWindow
        query={query}
        onQueryChange={setQuery}
        onSubmit={openSingleResult}
        resultCount={results.length}
        stats={toolStats(DESKTOP_APPS)}
      />
    </Desktop>
  );
}
