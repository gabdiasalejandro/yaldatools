import { useEffect, useRef } from "react";
import { useMessages } from "~/i18n/messages";

type PrivacyDialogProps = {
  open: boolean;
  onSend: () => void;
  onKeepLocal: () => void;
};

/** Asked before any image leaves the device. */
export function PrivacyDialog({ open, onSend, onKeepLocal }: PrivacyDialogProps) {
  const t = useMessages().removeBg;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      className="raised window privacy-dialog"
      aria-labelledby="privacy-title"
      onCancel={(event) => {
        event.preventDefault();
        onKeepLocal();
      }}
    >
      <div className="titlebar">
        <h2 id="privacy-title" style={{ margin: 0, fontSize: 15 }}>
          {t.privacyTitle}
        </h2>
      </div>
      <div className="window-body" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{t.privacyBody}</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" className="raised btn" onClick={onKeepLocal}>
            {t.privacyKeepLocal}
          </button>
          <button type="button" className="raised btn btn-primary" onClick={onSend}>
            {t.privacySend}
          </button>
        </div>
      </div>
    </dialog>
  );
}
