import { format, useLocale, useMessages } from "~/i18n/messages";
import { formatBytes } from "~/shared/format/bytes";
import type { PdfItem } from "./usePdfFiles";

type PdfFileCardProps = {
  item: PdfItem;
  /** Position in the list, from 1. */
  position: number;
  total: number;
  disabled: boolean;
  onMove: (item: PdfItem, direction: -1 | 1) => void;
  onRemove: (item: PdfItem) => void;
};

/** One PDF of the list: its pages, or why it is left out, and buttons to reorder or remove it. */
export function PdfFileCard({ item, position, total, disabled, onMove, onRemove }: PdfFileCardProps) {
  const t = useMessages().mergePdf;
  const locale = useLocale();
  const size = formatBytes(item.size, locale);

  return (
    <li className="sunken exif-card pdf-card" data-pdf-id={item.id}>
      <div className="pdf-card-head">
        <span className="pdf-card-position" aria-hidden="true">
          {position}
        </span>
        <h2 className="exif-card-name">{item.name}</h2>
      </div>

      {item.status === "reading" && <p className="exif-card-note">{format(t.reading, { size })}</p>}
      {item.status === "ready" && (
        <p className="exif-card-note">
          {format(item.pages === 1 ? t.onePage : t.pages, { count: item.pages })} · {size}
        </p>
      )}
      {item.status === "error" && (
        <p className="exif-card-error">
          {t.errors[item.reason]} {t.excluded}
        </p>
      )}

      <div className="exif-actions">
        <button
          type="button"
          className="raised btn"
          data-move="up"
          disabled={disabled || position === 1}
          aria-label={format(t.moveUpLabel, { name: item.name })}
          onClick={() => onMove(item, -1)}
        >
          ▲ {t.moveUp}
        </button>
        <button
          type="button"
          className="raised btn"
          data-move="down"
          disabled={disabled || position === total}
          aria-label={format(t.moveDownLabel, { name: item.name })}
          onClick={() => onMove(item, 1)}
        >
          ▼ {t.moveDown}
        </button>
        <button
          type="button"
          className="raised btn"
          disabled={disabled}
          aria-label={format(t.removeLabel, { name: item.name })}
          onClick={() => onRemove(item)}
        >
          {t.remove}
        </button>
      </div>
    </li>
  );
}
