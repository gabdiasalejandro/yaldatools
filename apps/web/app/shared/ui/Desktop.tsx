import type { ReactNode } from "react";
import { useMessages } from "~/i18n/messages";
import { Taskbar } from "./Taskbar";

type DesktopProps = {
  task: string;
  centered?: boolean;
  children: ReactNode;
};

/** Wallpaper, desktop area, illustration credit and taskbar shared by every page. */
export function Desktop({ task, centered = false, children }: DesktopProps) {
  const t = useMessages();
  return (
    <div className="desktop">
      <main className={`desktop-area ${centered ? "desktop-area--centered" : ""}`}>{children}</main>
      <p className="wallpaper-credit">{t.desktop.credit}</p>
      <Taskbar task={task} />
    </div>
  );
}
