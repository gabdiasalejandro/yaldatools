import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMessages } from "~/i18n/messages";
import { ACCEPT_ATTRIBUTE } from "./intake";

type PdfDropZoneProps = {
  onFiles: (files: File[]) => void;
  /** Compact strip shown above the list once there are files. */
  compact?: boolean;
  children?: ReactNode;
};

/** Choose, drop or paste (Ctrl+V anywhere on the page) one or several PDFs. */
export function PdfDropZone({ onFiles, compact = false, children }: PdfDropZoneProps) {
  const t = useMessages().mergePdf;
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = [...(event.clipboardData?.files ?? [])];
      if (files.length > 0) onFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFiles]);

  return (
    <div
      className={`sunken dropzone ${compact ? "exif-dropzone--compact" : ""} ${dragging ? "dropzone--active" : ""}`}
      role="group"
      aria-label={t.dropLabel}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const files = [...event.dataTransfer.files];
        if (files.length > 0) onFiles(files);
      }}
    >
      {!compact && (
        <>
          <p className="headline" style={{ fontSize: 22 }}>
            {t.dropTitle}
          </p>
          <p style={{ margin: 0 }}>{t.dropHint}</p>
        </>
      )}
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
      />
      <div className="exif-actions">
        <button type="button" className="raised btn btn-primary" onClick={() => input.current?.click()}>
          {compact ? t.addMore : t.choose}
        </button>
        {children}
      </div>
      {compact && <p className="exif-hint">{t.dropHint}</p>}
    </div>
  );
}
