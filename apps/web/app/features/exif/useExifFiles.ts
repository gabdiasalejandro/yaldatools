import { useCallback, useRef, useState } from "react";
import { MalformedFileError } from "./bytes";
import { cleanImage, MIME_TYPES, type ImageFormat } from "./clean";
import { checkFile, type IntakeError } from "./intake";
import { readMetadata, type FileMetadata } from "./metadata";

export type ExifError = IntakeError | "notDecodable";

type Outcome =
  | { status: "error"; reason: ExifError }
  | { status: "done"; format: ImageFormat; metadata: FileMetadata; cleaned: Uint8Array<ArrayBuffer> };

export type ExifItem = { id: number; name: string; size: number } & ({ status: "working" } | Outcome);

/** The browser must still open the cleaned file before it is offered. */
async function decodes(bytes: Uint8Array<ArrayBuffer>, format: ImageFormat): Promise<boolean> {
  if (typeof createImageBitmap !== "function") return true;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes], { type: MIME_TYPES[format] }));
    bitmap.close();
    return true;
  } catch {
    return false;
  }
}

async function processFile(file: File): Promise<Outcome> {
  const rejected = checkFile(file);
  if (rejected) return { status: "error", reason: rejected };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { status: "error", reason: "unreadable" };
  }
  try {
    const { format, bytes: cleaned } = cleanImage(bytes);
    const metadata = await readMetadata(bytes);
    const output = cleaned.slice();
    if (!(await decodes(output, format))) return { status: "error", reason: "notDecodable" };
    return { status: "done", format, metadata, cleaned: output };
  } catch (error) {
    const unsupported = error instanceof MalformedFileError && error.message === "Unsupported format";
    return { status: "error", reason: unsupported ? "unsupportedType" : "unreadable" };
  }
}

/** List of photos: each one is inspected and cleaned on the device as soon as it is added. */
export function useExifFiles() {
  const [items, setItems] = useState<ExifItem[]>([]);
  const nextId = useRef(1);

  const add = useCallback((files: readonly File[]) => {
    const added = files.map((file) => ({ id: nextId.current++, name: file.name, size: file.size, file }));
    setItems((previous) => [
      ...previous,
      ...added.map(({ id, name, size }): ExifItem => ({ id, name, size, status: "working" })),
    ]);
    for (const { id, name, size, file } of added) {
      void processFile(file).then((outcome) => {
        setItems((previous) =>
          previous.map((item): ExifItem => (item.id === id ? { id, name, size, ...outcome } : item)),
        );
      });
    }
  }, []);

  const remove = useCallback((id: number) => setItems((previous) => previous.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  return { items, add, remove, clear };
}
