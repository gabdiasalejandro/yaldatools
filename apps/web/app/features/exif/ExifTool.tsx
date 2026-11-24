import { useState } from "react";
import { format, useLocale, useMessages } from "~/i18n/messages";
import { saveFile } from "~/shared/browser/download";
import { Mascot } from "~/shared/ui/Mascot";
import { Window } from "~/shared/ui/Window";
import { MIME_TYPES } from "./clean";
import { formatBytes } from "./display";
import { ExifDropZone } from "./ExifDropZone";
import { ExifFileCard } from "./ExifFileCard";
import { cleanedName } from "./intake";
import { useExifFiles, type ExifItem } from "./useExifFiles";
import { buildZip } from "./zip";

type DoneItem = Extract<ExifItem, { status: "done" }>;

export function ExifTool() {
  const t = useMessages().exif;
  const locale = useLocale();
  const { items, add, remove, clear } = useExifFiles();
  const [zipping, setZipping] = useState(false);

  const done = items.filter((item): item is DoneItem => item.status === "done");
  const working = items.some((item) => item.status === "working") || zipping;
  const outputName = (item: DoneItem) => cleanedName(item.name, t.suffix, item.format);

  const downloadOne = (item: DoneItem) => saveFile(new Blob([item.cleaned], { type: MIME_TYPES[item.format] }), outputName(item));
  const downloadAll = async () => {
    setZipping(true);
    try {
      const zip = await buildZip(done.map((item) => ({ name: outputName(item), bytes: item.cleaned })));
      saveFile(new Blob([zip.slice()], { type: "application/zip" }), t.zipName);
    } finally {
      setZipping(false);
    }
  };

  const status = [t.statusLocal];
  if (items.length > 0) {
    const total = items.reduce((sum, item) => sum + item.size, 0);
    status.push(format(items.length === 1 ? t.statusFile : t.statusFiles, { count: items.length, size: formatBytes(total, locale) }));
  }

  return (
    <Window title={t.windowTitle} style={{ width: "100%", maxWidth: 960 }} status={status}>
      <div className="exif-tool">
        <div className="exif-main">
          {items.length === 0 ? (
            <ExifDropZone onFiles={add} />
          ) : (
            <>
              <ExifDropZone onFiles={add} compact>
                {done.length > 1 && (
                  <button type="button" className="raised btn" disabled={zipping} onClick={downloadAll}>
                    {t.downloadAll}
                  </button>
                )}
                <button type="button" className="raised btn" onClick={clear}>
                  {t.clearAll}
                </button>
              </ExifDropZone>
              <ul className="exif-list" aria-label={t.results}>
                {items.map((item) => (
                  <ExifFileCard key={item.id} item={item} onDownload={downloadOne} onRemove={remove} />
                ))}
              </ul>
            </>
          )}
          <p className="visually-hidden" aria-live="polite">
            {items.length > 0 && !working ? format(t.resultsAnnounce, { done: done.length, total: items.length }) : ""}
          </p>
        </div>
        <aside className="exif-side">
          <Mascot label={working ? t.mascotWorkingAlt : t.mascotIdleAlt} size={110} motion={working ? "busy" : "idle"} />
          <div className="sunken tooltip">{t.tip}</div>
        </aside>
      </div>
    </Window>
  );
}

/** Short help and FAQ under the tool, in the style of a Readme.txt window. */
export function ExifHelp() {
  const t = useMessages().exif;
  return (
    <section className="raised window" aria-labelledby="exif-help-title" style={{ width: "100%", maxWidth: 960 }}>
      <div className="titlebar">
        <h2 id="exif-help-title" className="exif-help-title">
          {t.helpTitle}
        </h2>
      </div>
      <div className="window-body sunken prose exif-help">
        {t.help.map((entry) => (
          <div key={entry.q}>
            <h3>{entry.q}</h3>
            <p>{entry.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
