import { format, useLocale, useMessages } from "~/i18n/messages";
import type { Locale } from "~/i18n/locales";
import { formatBytes, formatCoordinates, formatDate } from "./display";
import type { ExifItem } from "./useExifFiles";

type ExifFileCardProps = {
  item: ExifItem;
  onDownload: (item: Extract<ExifItem, { status: "done" }>) => void;
  onRemove: (id: number) => void;
};

/** One photo: what it revealed, and the cleaned copy to download. */
export function ExifFileCard({ item, onDownload, onRemove }: ExifFileCardProps) {
  const t = useMessages().exif;
  const locale = useLocale();

  return (
    <li className="sunken exif-card">
      <h2 className="exif-card-name">{item.name}</h2>

      {item.status === "working" && <p className="exif-card-note">{t.working}</p>}

      {item.status === "error" && <p className="exif-card-error">{t.errors[item.reason]}</p>}

      {item.status === "done" && <Details item={item} locale={locale} />}

      <div className="exif-actions">
        {item.status === "done" && (
          <button
            type="button"
            className="raised btn btn-primary"
            aria-label={format(t.downloadLabel, { name: item.name })}
            onClick={() => onDownload(item)}
          >
            {t.download}
          </button>
        )}
        <button
          type="button"
          className="raised btn"
          aria-label={format(t.removeLabel, { name: item.name })}
          onClick={() => onRemove(item.id)}
        >
          {t.remove}
        </button>
      </div>
    </li>
  );
}

function Details({ item, locale }: { item: Extract<ExifItem, { status: "done" }>; locale: Locale }) {
  const t = useMessages().exif;
  const { summary, report } = item.metadata;
  const rows: [string, string][] = [];
  if (summary.camera) rows.push([t.fields.camera, summary.camera]);
  if (summary.date) rows.push([t.fields.date, formatDate(summary.date, locale)]);
  if (summary.software) rows.push([t.fields.software, summary.software]);
  if (summary.author) rows.push([t.fields.author, summary.author]);
  if (summary.copyright) rows.push([t.fields.copyright, summary.copyright]);

  const blocks: string[] = [];
  if (report.xmp) blocks.push(t.blockNames.xmp);
  if (report.iptc) blocks.push(t.blockNames.iptc);
  if (report.comment) blocks.push(t.blockNames.comment);
  if (report.textChunks > 0) blocks.push(t.blockNames.text);
  if (report.time) blocks.push(t.blockNames.time);

  const gps = summary.gps;
  const found = rows.length > 0 || gps || summary.otherTags > 0 || blocks.length > 0;

  return (
    <>
      {gps && (
        <div className="exif-gps" role="note">
          <strong>⚠ {t.gpsWarning}</strong>
          <span>
            {gps.latitude !== null && gps.longitude !== null
              ? `${t.fields.location}: ${formatCoordinates(gps.latitude, gps.longitude)}`
              : t.gpsNoCoordinates}
          </span>
        </div>
      )}
      {rows.length > 0 && (
        <dl className="exif-fields">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {summary.otherTags > 0 && <p className="exif-card-note">{format(t.otherTags, { count: summary.otherTags })}</p>}
      {blocks.length > 0 && <p className="exif-card-note">{format(t.blocks, { list: blocks.join(", ") })}</p>}
      {!found && <p className="exif-card-note">{t.nothingFound}</p>}
      <p className="exif-card-note">
        {t.kept} {format(t.sizes, { before: formatBytes(item.size, locale), after: formatBytes(item.cleaned.length, locale) })}
      </p>
    </>
  );
}
