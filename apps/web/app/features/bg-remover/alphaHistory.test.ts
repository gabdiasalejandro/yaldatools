import { describe, expect, it } from "vitest";
import { canRedo, canUndo, current, initialHistory, push, redo, undo, MAX_HISTORY } from "./alphaHistory";

const mask = (value: number) => new Uint8ClampedArray([value]);

describe("alpha history", () => {
  it("undoes and redoes back to the latest mask", () => {
    let history = push(push(initialHistory(mask(0)), mask(1)), mask(2));
    history = undo(undo(history));
    expect(current(history)).toEqual(mask(0));
    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(true);
    history = redo(history);
    expect(current(history)).toEqual(mask(1));
    history = redo(history);
    expect(current(history)).toEqual(mask(2));
    expect(canRedo(history)).toBe(false);
  });

  it("drops the redo branch when a new edit is pushed after undo", () => {
    let history = undo(push(initialHistory(mask(0)), mask(1)));
    history = push(history, mask(9));
    expect(current(history)).toEqual(mask(9));
    expect(canRedo(history)).toBe(false);
    expect(current(undo(history))).toEqual(mask(0));
  });

  it("ignores undo and redo at the ends", () => {
    const history = initialHistory(mask(0));
    expect(undo(history)).toBe(history);
    expect(redo(history)).toBe(history);
  });

  it("keeps at most MAX_HISTORY masks, still allowing undo after trimming", () => {
    let history = initialHistory(mask(0));
    for (let value = 1; value <= MAX_HISTORY + 5; value++) history = push(history, mask(value));
    let undos = 0;
    while (canUndo(history)) {
      history = undo(history);
      undos++;
    }
    expect(undos).toBe(MAX_HISTORY - 1);
    expect(current(history)).toEqual(mask(6));
  });
});
