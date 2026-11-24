// Reading and merging PDFs on the device with pdf-lib (MIT), loaded only on this page.

export type PdfProblem = "encrypted" | "broken";
export type PdfInspection = { ok: true; pages: number } | { ok: false; reason: PdfProblem };

const LOAD_OPTIONS = { updateMetadata: false } as const;

/** Page count of a PDF, or why it cannot be merged. Never throws. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInspection> {
  const { PDFDocument } = await import("pdf-lib");
  try {
    // pdf-lib refuses encrypted files with an error that cannot be told apart by class,
    // so they are opened anyway just to ask; their pages are never copied.
    const doc = await PDFDocument.load(bytes, { ...LOAD_OPTIONS, ignoreEncryption: true });
    if (doc.isEncrypted) return { ok: false, reason: "encrypted" };
    const pages = doc.getPageCount();
    // A document without pages has nothing to give to the merged file.
    return pages > 0 ? { ok: true, pages } : { ok: false, reason: "broken" };
  } catch {
    return { ok: false, reason: "broken" };
  }
}

/** Every page of every PDF, in the order given, in a new document. */
export async function mergePdfs(
  sources: readonly Uint8Array[],
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  for (const [index, bytes] of sources.entries()) {
    const source = await PDFDocument.load(bytes, LOAD_OPTIONS);
    const pages = await merged.copyPages(source, source.getPageIndices());
    for (const page of pages) merged.addPage(page);
    onProgress?.(index + 1, sources.length);
  }
  const output = await merged.save();
  return output.slice();
}
