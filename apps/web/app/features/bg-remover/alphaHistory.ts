import type { AlphaMask } from "./raster";

/** Each mask is ~4 MB at 2048², so the history (undo and redo together) is kept short. */
export const MAX_HISTORY = 15;

/** Linear undo/redo history: `masks[index]` is the visible mask, later entries are redoable. */
export interface AlphaHistory {
  readonly masks: readonly AlphaMask[];
  readonly index: number;
}

export const initialHistory = (initial: AlphaMask): AlphaHistory => ({ masks: [initial], index: 0 });

export const current = (history: AlphaHistory): AlphaMask => history.masks[history.index];

export const canUndo = (history: AlphaHistory): boolean => history.index > 0;

export const canRedo = (history: AlphaHistory): boolean => history.index < history.masks.length - 1;

/** A new edit discards the redo branch and trims the oldest masks beyond MAX_HISTORY. */
export function push(history: AlphaHistory, next: AlphaMask): AlphaHistory {
  const masks = [...history.masks.slice(0, history.index + 1), next].slice(-MAX_HISTORY);
  return { masks, index: masks.length - 1 };
}

export const undo = (history: AlphaHistory): AlphaHistory =>
  canUndo(history) ? { ...history, index: history.index - 1 } : history;

export const redo = (history: AlphaHistory): AlphaHistory =>
  canRedo(history) ? { ...history, index: history.index + 1 } : history;
