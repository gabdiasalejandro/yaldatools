// Reads what a photo reveals. exifr (MIT) is loaded only when this page needs it.
import { inspectContainer, type ContainerReport } from "./clean";
import { summarizeTags, type MetadataSummary, type Tags } from "./summary";

export type FileMetadata = {
  report: ContainerReport;
  summary: MetadataSummary;
  /** Every tag exifr returned, for the full list; empty when there were none or they were unreadable. */
  tags: Tags;
  /** The Exif block exists but could not be parsed. It is still removed. */
  readError: boolean;
};

type ReadResult = { tags: Tags | undefined; error: boolean };

async function readTags(tiff: Uint8Array): Promise<ReadResult> {
  const { default: exifr } = await import("exifr");
  try {
    // The TIFF block is handed over directly, so exifr works the same for JPEG, PNG and WebP.
    const tags: unknown = await exifr.parse(tiff, {
      tiff: true,
      ifd0: {},
      exif: true,
      gps: true,
      interop: false,
      ifd1: false,
      // Kept as raw bytes: only their presence and size are shown, never their contents.
      makerNote: true,
      userComment: true,
      xmp: false,
      iptc: false,
      icc: false,
      jfif: false,
      ihdr: false,
      // Raw codes, so the page can describe them in its own language.
      translateValues: false,
      mergeOutput: true,
    });
    if (!tags || typeof tags !== "object") return { tags: undefined, error: false };
    // With its default silent errors, exifr returns what it could read plus an `errors` list.
    const { errors, ...read } = tags as Tags;
    const failed = Array.isArray(errors) && errors.length > 0;
    const found = Object.keys(read).length > 0;
    return { tags: found ? read : undefined, error: failed && !found };
  } catch {
    // Unreadable tags are still removed; they just cannot be listed.
    return { tags: undefined, error: true };
  }
}

export async function readMetadata(bytes: Uint8Array): Promise<FileMetadata> {
  const report = inspectContainer(bytes);
  const { tags, error } = report.tiff ? await readTags(report.tiff) : { tags: undefined, error: false };
  const summary = summarizeTags(tags);
  if (!summary.gps && report.xmpGps) summary.gps = { latitude: null, longitude: null };
  return { report, summary, tags: tags ?? {}, readError: error };
}
