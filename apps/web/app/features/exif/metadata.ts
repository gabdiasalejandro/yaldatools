// Reads what a photo reveals. exifr (MIT) is loaded only when this page needs it.
import { inspectContainer, type ContainerReport } from "./clean";
import { summarizeTags, type MetadataSummary, type Tags } from "./summary";

export type FileMetadata = { report: ContainerReport; summary: MetadataSummary };

async function readTags(tiff: Uint8Array): Promise<Tags | undefined> {
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
      makerNote: false,
      userComment: false,
      xmp: false,
      iptc: false,
      icc: false,
      jfif: false,
      ihdr: false,
      mergeOutput: true,
    });
    return tags && typeof tags === "object" ? (tags as Tags) : undefined;
  } catch {
    // Unreadable tags are still removed; they just cannot be listed.
    return undefined;
  }
}

export async function readMetadata(bytes: Uint8Array): Promise<FileMetadata> {
  const report = inspectContainer(bytes);
  const summary = summarizeTags(report.tiff ? await readTags(report.tiff) : undefined);
  if (!summary.gps && report.xmpGps) summary.gps = { latitude: null, longitude: null };
  return { report, summary };
}
