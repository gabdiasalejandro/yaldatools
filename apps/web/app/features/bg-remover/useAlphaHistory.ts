import { useCallback, useState } from "react";
import type { AlphaMask } from "./raster";

/** Each mask is ~4 MB at 2048², so the undo history is kept short. */
const MAX_HISTORY = 15;

export function useAlphaHistory(initial: AlphaMask) {
  const [stack, setStack] = useState<AlphaMask[]>([initial]);
  const push = useCallback((next: AlphaMask) => setStack((previous) => [...previous.slice(-(MAX_HISTORY - 1)), next]), []);
  const undo = useCallback(() => setStack((previous) => (previous.length > 1 ? previous.slice(0, -1) : previous)), []);
  return { alpha: stack[stack.length - 1], push, undo, canUndo: stack.length > 1 };
}
