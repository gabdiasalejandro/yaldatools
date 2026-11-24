// Rules for the images the background remover accepts.

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** Longest side after downscaling: keeps memory and processing time bounded. */
export const MAX_SIDE = 2048;

export type IntakeError = "unsupportedType" | "tooLarge" | "unreadable";

export function checkFile(file: { type: string; size: number }): IntakeError | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "unsupportedType";
  if (file.size > MAX_FILE_BYTES) return "tooLarge";
  return null;
}

export function fitWithin(width: number, height: number, max = MAX_SIDE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
