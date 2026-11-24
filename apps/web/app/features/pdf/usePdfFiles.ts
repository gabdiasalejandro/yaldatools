import { useCallback, useRef, useState } from "react";
import { checkSizes, isPdf, type SizeError } from "./intake";
import { inspectPdf, type PdfProblem } from "./merge";
import { moveItem } from "./order";

export type PdfError = SizeError | PdfProblem | "notPdf" | "unreadable";

type Outcome = { status: "error"; reason: PdfError } | { status: "ready"; pages: number; bytes: Uint8Array };

export type PdfItem = { id: number; name: string; size: number } & ({ status: "reading" } | Outcome);
export type ReadyPdf = Extract<PdfItem, { status: "ready" }>;

async function readPdf(file: File): Promise<Outcome> {
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { status: "error", reason: "unreadable" };
  }
  if (!isPdf(bytes)) return { status: "error", reason: "notPdf" };
  const inspection = await inspectPdf(bytes);
  return inspection.ok ? { status: "ready", pages: inspection.pages, bytes } : { status: "error", reason: inspection.reason };
}

/** Bytes held by the list: files being read or ready to merge. */
function heldBytes(items: readonly PdfItem[]): number {
  return items.reduce((sum, item) => (item.status === "error" ? sum : sum + item.size), 0);
}

/** List of PDFs to merge: each one is checked on the device as soon as it is added. */
export function usePdfFiles() {
  const [items, setItems] = useState<readonly PdfItem[]>([]);
  // Last rendered list plus files added since, so two quick additions share the 300 MB budget.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const nextId = useRef(1);

  const add = useCallback((files: readonly File[]) => {
    const sizeErrors = checkSizes(files, heldBytes(itemsRef.current));
    const added = files.map((file, i) => ({ id: nextId.current++, name: file.name, size: file.size, file, sizeError: sizeErrors[i] }));
    const placeholders = added.map(({ id, name, size, sizeError }): PdfItem =>
      sizeError ? { id, name, size, status: "error", reason: sizeError } : { id, name, size, status: "reading" },
    );
    itemsRef.current = [...itemsRef.current, ...placeholders];
    setItems((previous) => [...previous, ...placeholders]);
    for (const { id, file, sizeError } of added) {
      if (sizeError) continue;
      void readPdf(file).then((outcome) => {
        setItems((previous) =>
          previous.map((item): PdfItem => (item.id === id ? { id, name: item.name, size: item.size, ...outcome } : item)),
        );
      });
    }
  }, []);

  const remove = useCallback((id: number) => setItems((previous) => previous.filter((item) => item.id !== id)), []);
  const move = useCallback((id: number, direction: -1 | 1) => setItems((previous) => moveItem(previous, id, direction)), []);
  const clear = useCallback(() => setItems([]), []);

  return { items, add, remove, move, clear };
}
