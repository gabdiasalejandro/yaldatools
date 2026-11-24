import { useEffect, useRef, useState } from "react";
import { useMessages } from "~/i18n/messages";
import { ACCEPTED_TYPES } from "./intake";

/** Choose, drop or paste (Ctrl+V anywhere on the page) one image. */
export function DropZone({ onFile }: { onFile: (file: File) => void }) {
  const t = useMessages();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const file = [...(event.clipboardData?.files ?? [])][0];
      if (file) onFile(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onFile]);

  return (
    <div
      className={`sunken dropzone ${dragging ? "dropzone--active" : ""}`}
      role="group"
      aria-label={t.removeBg.dropLabel}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
    >
      <p className="headline" style={{ fontSize: 22 }}>
        {t.removeBg.dropTitle}
      </p>
      <p style={{ margin: 0 }}>{t.removeBg.dropHint}</p>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      <button type="button" className="raised btn btn-primary" onClick={() => input.current?.click()}>
        {t.removeBg.choose}
      </button>
    </div>
  );
}
