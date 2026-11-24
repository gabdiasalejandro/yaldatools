// "Download all": a ZIP built on the device with fflate (MIT), loaded only when asked for.
import { uniqueNames } from "./intake";

export type ZipEntry = { name: string; bytes: Uint8Array };

export async function buildZip(entries: readonly ZipEntry[]): Promise<Uint8Array> {
  const { zipSync } = await import("fflate");
  const names = uniqueNames(entries.map((entry) => entry.name));
  // Photos are already compressed: storing them is as small and much faster.
  return zipSync(Object.fromEntries(entries.map((entry, i) => [names[i], entry.bytes])), { level: 0 });
}
