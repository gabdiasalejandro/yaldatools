// Rules for the files the PDF merger accepts and the name of what it gives back.

export const ACCEPT_ATTRIBUTE = "application/pdf,.pdf";
const MB = 1024 * 1024;
/** Everything is merged in memory on the device, so sizes are capped. */
export const MAX_FILE_BYTES = 100 * MB;
export const MAX_TOTAL_BYTES = 300 * MB;

export type SizeError = "tooLarge" | "totalTooLarge";

const SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
/** Readers accept the header anywhere in the first kilobyte. */
const HEADER_WINDOW = 1024;

/** True when the bytes really are a PDF, whatever the name or type of the file say. */
export function isPdf(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, HEADER_WINDOW) - SIGNATURE.length;
  for (let start = 0; start <= end; start++) {
    if (SIGNATURE.every((byte, i) => bytes[start + i] === byte)) return true;
  }
  return false;
}

/**
 * Size check for a batch of new files, given the bytes already in the list.
 * Accepted files count towards the total; rejected ones do not.
 */
export function checkSizes(files: readonly { size: number }[], currentTotal: number): (SizeError | null)[] {
  let total = currentTotal;
  return files.map((file) => {
    if (file.size > MAX_FILE_BYTES) return "tooLarge";
    if (total + file.size > MAX_TOTAL_BYTES) return "totalTooLarge";
    total += file.size;
    return null;
  });
}

/** "unido" → "unido.pdf"; a name that already ends in .pdf is kept. */
export function mergedName(name: string): string {
  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}
