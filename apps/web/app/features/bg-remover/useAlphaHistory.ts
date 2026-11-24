import { useCallback, useState } from "react";
import * as history from "./alphaHistory";
import type { AlphaMask } from "./raster";

export function useAlphaHistory(initial: AlphaMask) {
  const [state, setState] = useState(() => history.initialHistory(initial));
  const push = useCallback((next: AlphaMask) => setState((previous) => history.push(previous, next)), []);
  const undo = useCallback(() => setState(history.undo), []);
  const redo = useCallback(() => setState(history.redo), []);
  return {
    alpha: history.current(state),
    push,
    undo,
    redo,
    canUndo: history.canUndo(state),
    canRedo: history.canRedo(state),
  };
}
