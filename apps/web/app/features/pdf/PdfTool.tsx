import { useEffect, useRef, useState } from "react";
import { formatBytes } from "~/shared/format/bytes";
import { format, useLocale, useMessages } from "~/i18n/messages";
import { saveFile } from "~/shared/browser/download";
import { Mascot } from "~/shared/ui/Mascot";
import { Window } from "~/shared/ui/Window";
import { mergedName } from "./intake";
import { mergePdfs } from "./merge";
import { PdfDropZone } from "./PdfDropZone";
import { PdfFileCard } from "./PdfFileCard";
import { usePdfFiles, type PdfItem, type ReadyPdf } from "./usePdfFiles";

type Progress = { done: number; total: number };

export function PdfTool() {
  const t = useMessages().mergePdf;
  const locale = useLocale();
  const { items, add, remove, move, clear } = usePdfFiles();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [focusAfterMove, setFocusAfterMove] = useState<{ id: number; direction: -1 | 1 } | null>(null);
  const list = useRef<HTMLUListElement>(null);

  const ready = items.filter((item): item is ReadyPdf => item.status === "ready");
  const reading = items.some((item) => item.status === "reading");
  const merging = progress !== null;
  const totalPages = ready.reduce((sum, item) => sum + item.pages, 0);

  // Moving a card re-renders the list: keep the keyboard focus on the button that was pressed,
  // or on the other one when the card reached an end of the list.
  useEffect(() => {
    if (!focusAfterMove) return;
    const card = list.current?.querySelector(`[data-pdf-id="${focusAfterMove.id}"]`);
    const same = card?.querySelector<HTMLButtonElement>(`[data-move="${focusAfterMove.direction === -1 ? "up" : "down"}"]`);
    const other = card?.querySelector<HTMLButtonElement>(`[data-move="${focusAfterMove.direction === -1 ? "down" : "up"}"]`);
    (same && !same.disabled ? same : other)?.focus();
    setFocusAfterMove(null);
  }, [focusAfterMove, items]);

  const onMove = (item: PdfItem, direction: -1 | 1) => {
    const from = items.findIndex((entry) => entry.id === item.id);
    move(item.id, direction);
    setFocusAfterMove({ id: item.id, direction });
    setAnnouncement(format(t.movedAnnounce, { name: item.name, position: from + 1 + direction, total: items.length }));
  };

  const onRemove = (item: PdfItem) => {
    remove(item.id);
    setAnnouncement(format(t.removedAnnounce, { name: item.name }));
  };

  const onAdd = (files: File[]) => {
    setAnnouncement("");
    add(files);
  };

  const merge = async () => {
    const sources = ready;
    setProgress({ done: 0, total: sources.length });
    setAnnouncement(t.merging);
    try {
      const output = await mergePdfs(
        sources.map((item) => item.bytes),
        (done, total) => setProgress({ done, total }),
      );
      const name = mergedName(t.outputName);
      saveFile(new Blob([output], { type: "application/pdf" }), name);
      const pages = sources.reduce((sum, item) => sum + item.pages, 0);
      setAnnouncement(format(t.mergedAnnounce, { pages, files: sources.length, name }));
    } catch {
      setAnnouncement(t.mergeFailed);
    } finally {
      setProgress(null);
    }
  };

  const status = [t.statusLocal];
  if (items.length > 0) {
    const total = items.reduce((sum, item) => sum + item.size, 0);
    status.push(
      format(items.length === 1 ? t.statusFile : t.statusFiles, {
        count: items.length,
        pages: format(totalPages === 1 ? t.onePage : t.pages, { count: totalPages }),
        size: formatBytes(total, locale),
      }),
    );
  }

  const canMerge = ready.length >= 2 && !reading && !merging;

  return (
    <Window title={t.windowTitle} style={{ width: "100%", maxWidth: 960 }} status={status}>
      <div className="exif-tool">
        <div className="exif-main">
          {items.length === 0 ? (
            <PdfDropZone onFiles={onAdd} />
          ) : (
            <>
              <PdfDropZone onFiles={onAdd} compact>
                <button type="button" className="raised btn" disabled={merging} onClick={clear}>
                  {t.clearAll}
                </button>
              </PdfDropZone>
              <ul ref={list} className="exif-list" aria-label={t.results}>
                {items.map((item, index) => (
                  <PdfFileCard
                    key={item.id}
                    item={item}
                    position={index + 1}
                    total={items.length}
                    disabled={merging}
                    onMove={onMove}
                    onRemove={onRemove}
                  />
                ))}
              </ul>
              <div className="pdf-merge">
                <button type="button" className="raised btn btn-primary" disabled={!canMerge} onClick={merge}>
                  {t.merge}
                </button>
                <p className="exif-card-note">
                  {merging
                    ? format(t.progress, { done: progress.done, total: progress.total })
                    : reading
                      ? t.waitReading
                      : ready.length < 2
                        ? t.needTwo
                        : format(t.willMerge, { files: ready.length, pages: totalPages })}
                </p>
              </div>
            </>
          )}
          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </div>
        <aside className="exif-side">
          <Mascot
            label={merging || reading ? t.mascotWorkingAlt : t.mascotIdleAlt}
            size={110}
            motion={merging || reading ? "busy" : "idle"}
          />
          <div className="sunken tooltip">{t.tip}</div>
        </aside>
      </div>
    </Window>
  );
}

/** Short help and FAQ under the tool, in the style of a Readme.txt window. */
export function PdfHelp() {
  const t = useMessages().mergePdf;
  return (
    <section className="raised window" aria-labelledby="pdf-help-title" style={{ width: "100%", maxWidth: 960 }}>
      <div className="titlebar">
        <h2 id="pdf-help-title" className="exif-help-title">
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
