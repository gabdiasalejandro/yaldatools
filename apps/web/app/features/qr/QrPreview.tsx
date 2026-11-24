import { useEffect, useRef } from "react";
import type QRCodeStyling from "qr-code-styling";
import { useMessages } from "~/i18n/messages";
import { createPreview } from "./render";
import { toStylingOptions, type QrAppearance } from "./styling";

const PREVIEW_SIZE = 260;

export function QrPreview({ appearance, data }: { appearance: QrAppearance; data: string | null }) {
  const t = useMessages();
  const container = useRef<HTMLDivElement>(null);
  const qr = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    if (qr.current) {
      qr.current.update(toStylingOptions(appearance, data, PREVIEW_SIZE));
      return;
    }
    createPreview(appearance, data, PREVIEW_SIZE).then((instance) => {
      if (cancelled || !container.current) return;
      qr.current = instance;
      instance.append(container.current);
    });
    return () => {
      cancelled = true;
    };
  }, [appearance, data]);

  return (
    <div className="sunken" style={{ background: "#fff", padding: 12, width: PREVIEW_SIZE + 28, maxWidth: "100%" }}>
      <div
        ref={container}
        role="img"
        aria-label={t.qr.preview}
        hidden={!data}
        style={{ width: PREVIEW_SIZE, maxWidth: "100%", aspectRatio: "1" }}
      />
      {!data && (
        <p
          style={{
            margin: 0,
            width: PREVIEW_SIZE,
            maxWidth: "100%",
            aspectRatio: "1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            color: "#555",
          }}
        >
          {t.qr.empty}
        </p>
      )}
    </div>
  );
}
