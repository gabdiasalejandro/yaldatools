import { useRef, useState } from "react";
import { format, useMessages } from "~/i18n/messages";
import { Mascot } from "~/shared/ui/Mascot";
import { Window } from "~/shared/ui/Window";
import { EMPTY_CONTENTS, QR_TYPES, type ContentOf, type QrContents } from "./contents";
import { hasScanRisk } from "./contrast";
import { buildPayload, type QrType } from "./payload";
import { QrAppearanceFields } from "./QrAppearanceFields";
import { QrContentFields } from "./QrContentFields";
import { QrPreview } from "./QrPreview";
import { saveFile } from "~/shared/browser/download";
import { copyImage, renderFile } from "./render";
import { DEFAULT_APPEARANCE, effectiveEcc, type PngSize, type QrAppearance } from "./styling";

type Notice = { kind: "ok" | "error"; text: string } | null;

export function QrTool() {
  const t = useMessages();
  const [type, setType] = useState<QrType>("url");
  const [contents, setContents] = useState<QrContents>(EMPTY_CONTENTS);
  const [appearance, setAppearance] = useState<QrAppearance>(DEFAULT_APPEARANCE);
  const [pngSize, setPngSize] = useState<PngSize>(1024);
  const [notice, setNotice] = useState<Notice>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const data = buildPayload(contents[type]);
  const risky = hasScanRisk(appearance.dots, appearance.background);

  const updateContent = <T extends QrType>(target: T, patch: Partial<ContentOf<T>>) =>
    setContents((previous) => ({ ...previous, [target]: { ...previous[target], ...patch } }));

  // Arrow keys move between tabs, as in the WAI-ARIA tabs pattern.
  const onTabKey = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const next = (index + step + QR_TYPES.length) % QR_TYPES.length;
    setType(QR_TYPES[next]);
    tabs.current[next]?.focus();
  };

  const run = async (action: () => Promise<void>, failure: string, success?: string) => {
    try {
      await action();
      setNotice(success ? { kind: "ok", text: success } : null);
    } catch {
      setNotice({ kind: "error", text: failure });
    }
  };

  const download = (fileFormat: "png" | "svg") =>
    data &&
    run(async () => saveFile(await renderFile(appearance, data, fileFormat, pngSize), `qr-yaldatools.${fileFormat}`), t.qr.renderFailed);

  const copy = () =>
    data && run(async () => copyImage(await renderFile(appearance, data, "png", pngSize)), t.qr.copyFailed, t.qr.copied);

  return (
    <Window
      title={t.qr.windowTitle}
      style={{ width: "100%", maxWidth: 1080 }}
      status={[t.qr.statusLocal, format(t.qr.statusEcc, { level: effectiveEcc(appearance) })]}
    >
      <div role="tablist" aria-label={t.qr.typeTabs} className="qr-tabs">
        {QR_TYPES.map((qrType, index) => (
          <button
            key={qrType}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`qr-tab-${qrType}`}
            aria-selected={type === qrType}
            aria-controls="qr-panel"
            tabIndex={type === qrType ? 0 : -1}
            className="raised btn qr-tab"
            onClick={() => setType(qrType)}
            onKeyDown={(event) => onTabKey(event, index)}
          >
            {t.qr.types[qrType]}
          </button>
        ))}
      </div>

      <div id="qr-panel" role="tabpanel" aria-labelledby={`qr-tab-${type}`} className="qr-panel">
        <div style={{ flex: "999 1 420px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          <QrContentFields
            key={type}
            type={type}
            content={contents[type]}
            onChange={(patch) => updateContent(type, patch)}
          />
          <QrAppearanceFields
            appearance={appearance}
            onChange={(patch) => setAppearance((previous) => ({ ...previous, ...patch }))}
            pngSize={pngSize}
            onPngSizeChange={setPngSize}
          />
        </div>

        <div style={{ flex: "1 1 300px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <QrPreview appearance={appearance} data={data} />
          {risky && (
            <p role="alert" className="sunken tooltip" style={{ margin: 0 }}>
              ⚠ {t.qr.contrastWarning}
            </p>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="raised btn btn-primary" disabled={!data} onClick={() => download("png")}>
              {t.qr.downloadPng}
            </button>
            <button type="button" className="raised btn" disabled={!data} onClick={() => download("svg")}>
              {t.qr.downloadSvg}
            </button>
            <button type="button" className="raised btn" disabled={!data} onClick={copy}>
              {t.qr.copy}
            </button>
          </div>
          <p role="status" style={{ margin: 0, minHeight: "1.2em", color: notice?.kind === "error" ? "#8b0000" : undefined }}>
            {notice?.text ?? ""}
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <Mascot label={t.qr.mascotAlt} size={96} />
            <div className="sunken tooltip" style={{ maxWidth: 190 }}>
              {t.qr.tip}
            </div>
          </div>
        </div>
      </div>
    </Window>
  );
}
