import { useId } from "react";
import { format, useMessages } from "~/i18n/messages";
import { MascotSlot } from "~/shared/ui/MascotSlot";
import { Window } from "~/shared/ui/Window";

type WelcomeWindowProps = {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: () => void;
  resultCount: number;
  stats: { total: number; ready: number };
};

export function WelcomeWindow({ query, onQueryChange, onSubmit, resultCount, stats }: WelcomeWindowProps) {
  const t = useMessages();
  const searchId = useId();
  return (
    <Window
      title={t.home.windowTitle}
      closable={false}
      style={{ flex: "0 1 500px", marginTop: 24 }}
      status={[format(t.home.status, stats), t.home.noAds]}
    >
      <div className="window-body" style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div style={{ flex: "999 1 280px", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <p className="headline">{t.home.headline}</p>
          <p style={{ margin: 0, lineHeight: 1.5 }}>{t.home.intro}</p>
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit();
            }}
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <label htmlFor={searchId} style={{ fontSize: 13 }}>
              {t.home.searchLabel}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                id={searchId}
                className="sunken field"
                type="search"
                placeholder={t.home.searchPlaceholder}
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                style={{ flex: "1 1 auto" }}
              />
              <button type="submit" className="raised btn">
                {t.home.searchButton}
              </button>
            </div>
          </form>
          <p role="status" style={{ margin: 0, fontSize: 13, minHeight: "1.2em" }}>
            {resultCount === 0 ? t.home.noResults : ""}
          </p>
        </div>
        <div style={{ flex: "1 1 140px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div className="sunken tooltip">{t.home.mascotSays}</div>
          <MascotSlot label={t.home.mascotAlt} size={140} />
        </div>
      </div>
    </Window>
  );
}
