import type { ReactNode } from "react";
import { Link } from "react-router";
import { useLocale, useMessages } from "~/i18n/messages";
import { pathFor } from "~/i18n/pages";

type WindowProps = {
  title: string;
  /** Close button goes back to the desktop; the home window has nowhere to go. */
  closable?: boolean;
  status?: ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  children: ReactNode;
};

export function Window({ title, closable = true, status, className, style, children }: WindowProps) {
  const t = useMessages();
  const locale = useLocale();
  return (
    <section className={`raised window ${className ?? ""}`} aria-labelledby="window-title" style={style}>
      <div className="titlebar">
        <h1 id="window-title">{title}</h1>
        {closable && (
          <div className="titlebar-controls">
            <Link to={pathFor("home", locale)} className="raised titlebar-control" aria-label={t.window.close}>
              ×
            </Link>
          </div>
        )}
      </div>
      {children}
      {status && status.length > 0 && (
        <div className="statusbar">
          {status.map((item, index) => (
            <div className="sunken" key={index}>
              {item}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
