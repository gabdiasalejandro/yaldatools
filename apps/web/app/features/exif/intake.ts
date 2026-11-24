// Rules for the files the EXIF remover accepts and the names of what it gives back.
import type { ImageFormat } from "./clean";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES, ".jpg", ".jpeg", ".png", ".webp"].join(",");
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type IntakeError = "unsupportedType" | "tooLarge" | "unreadable";

/** Quick check before reading; the real format is confirmed from the bytes afterwards. */
export function checkFile(file: { type: string; size: number }): IntakeError | null {
  if (file.type && !(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return "unsupportedType";
  if (file.size > MAX_FILE_BYTES) return "tooLarge";
  return null;
}

const EXTENSIONS: Record<ImageFormat, string> = { jpeg: ".jpg", png: ".png", webp: ".webp" };

/** "photo.jpg" → "photo-no-exif.jpg": same extension, suffix in the page language. */
export function cleanedName(name: string, suffix: string, format: ImageFormat): string {
  const dot = name.lastIndexOf(".");
  if (dot > 0) return `${name.slice(0, dot)}${suffix}${name.slice(dot)}`;
  return `${name || "image"}${suffix}${EXTENSIONS[format]}`;
}

/** Numbers repeated names (case-insensitively) so none overwrites another inside a ZIP. */
export function uniqueNames(names: readonly string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count === 1) return name;
    const dot = name.lastIndexOf(".");
    return dot > 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
  });
}
