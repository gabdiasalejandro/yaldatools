// PDFs generated on the fly for the tests with pdf-lib itself: no binary fixtures.
import { PDFDocument } from "pdf-lib";

/** One page per entry; each page gets a distinct width so its origin can be told after merging. */
export async function makePdf(widths: readonly number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const width of widths) doc.addPage([width, 400]);
  return doc.save({ useObjectStreams: false });
}

/** A valid PDF whose trailer claims it is encrypted, which is how pdf-lib detects protection. */
export async function makeEncryptedPdf(): Promise<Uint8Array> {
  const text = new TextDecoder("latin1").decode(await makePdf([300]));
  const marked = text.replace(/trailer\s*<</, (match) => `${match}\n/Encrypt << /Filter /Standard /V 1 /R 2 >>`);
  if (marked === text) throw new Error("No trailer found");
  return Uint8Array.from(marked, (char) => char.charCodeAt(0));
}

/** Starts like a PDF but holds nothing a reader can use. */
export function makeCorruptPdf(): Uint8Array {
  return new TextEncoder().encode("%PDF-1.7\nthis is not really a pdf\n%%EOF\n");
}
