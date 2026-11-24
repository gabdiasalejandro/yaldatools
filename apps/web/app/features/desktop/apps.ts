import type { Messages } from "~/i18n/messages";
import type { PageId } from "~/i18n/pages";
import type { IconKind } from "~/shared/ui/PixelIcon";

export type AppId = keyof Messages["desktop"]["apps"];
type AppTexts = Messages["desktop"]["apps"];

export type DesktopApp = {
  id: AppId;
  icon: IconKind;
  /** "tool" counts as a program; "file" is a document such as Readme.txt. */
  kind: "tool" | "file";
  /** Page it opens; programs without one are shown as "soon" and are not links. */
  page?: PageId;
  soon?: boolean;
};

export const DESKTOP_APPS: readonly DesktopApp[] = [
  { id: "removeBg", icon: "bg", kind: "tool", page: "removeBg", soon: true },
  { id: "qr", icon: "qr", kind: "tool", page: "qr" },
  { id: "compress", icon: "img", kind: "tool", soon: true },
  { id: "mergePdf", icon: "pdf", kind: "tool", soon: true },
  { id: "passwords", icon: "lock", kind: "tool", soon: true },
  { id: "exif", icon: "exif", kind: "tool", soon: true },
  { id: "readme", icon: "note", kind: "file", page: "readme" },
  { id: "support", icon: "heart", kind: "file", page: "support" },
];

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Programs whose label or keywords contain every word of the query. */
export function searchApps(apps: readonly DesktopApp[], texts: AppTexts, query: string): DesktopApp[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return apps.filter((app) => {
    const haystack = normalize(`${texts[app.id].label} ${texts[app.id].keywords}`);
    return words.every((word) => haystack.includes(word));
  });
}

export function toolStats(apps: readonly DesktopApp[]): { total: number; ready: number } {
  const tools = apps.filter((app) => app.kind === "tool");
  return { total: tools.length, ready: tools.filter((app) => !app.soon).length };
}
