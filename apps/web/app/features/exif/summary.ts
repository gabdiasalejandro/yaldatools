// Turns the raw tags read by exifr into the few facts a person wants to see.

export type Tags = Record<string, unknown>;

export type MetadataSummary = {
  camera?: string;
  date?: Date | string;
  software?: string;
  author?: string;
  copyright?: string;
  /** Present whenever the file carries location tags; coordinates may be unreadable. */
  gps?: { latitude: number | null; longitude: number | null };
  /** Remaining tags (exposure, lens, dimensions…), not shown one by one. */
  otherTags: number;
};

const SHOWN = new Set(["Make", "Model", "DateTimeOriginal", "CreateDate", "ModifyDate", "Software", "Artist", "Copyright"]);

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);
const isGpsKey = (key: string) => key.startsWith("GPS") || key === "latitude" || key === "longitude";

export function summarizeTags(tags: Tags | undefined): MetadataSummary {
  if (!tags) return { otherTags: 0 };
  const summary: MetadataSummary = { otherTags: 0 };

  const make = text(tags.Make);
  const model = text(tags.Model);
  if (make || model) summary.camera = make && model && !model.startsWith(make) ? `${make} ${model}` : (model ?? make);

  for (const key of ["DateTimeOriginal", "CreateDate", "ModifyDate"]) {
    const value = tags[key];
    if (value instanceof Date && !Number.isNaN(value.getTime())) summary.date = value;
    else if (text(value)) summary.date = text(value);
    if (summary.date) break;
  }

  const software = text(tags.Software);
  if (software) summary.software = software;
  const author = text(tags.Artist);
  if (author) summary.author = author;
  const copyright = text(tags.Copyright);
  if (copyright) summary.copyright = copyright;

  const keys = Object.keys(tags);
  if (keys.some(isGpsKey)) summary.gps = { latitude: number(tags.latitude), longitude: number(tags.longitude) };
  // Orientation is kept on purpose, so it is not counted as data to remove.
  summary.otherTags = keys.filter((key) => !SHOWN.has(key) && !isGpsKey(key) && key !== "Orientation").length;
  return summary;
}
