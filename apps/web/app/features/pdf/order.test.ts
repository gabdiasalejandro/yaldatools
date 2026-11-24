import { describe, expect, it } from "vitest";
import { moveItem } from "./order";

const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
const ids = (items: readonly { id: number }[]) => items.map((item) => item.id);

describe("moveItem", () => {
  it("moves an item up one place", () => {
    expect(ids(moveItem(list, 2, -1))).toEqual([2, 1, 3]);
  });

  it("moves an item down one place", () => {
    expect(ids(moveItem(list, 2, 1))).toEqual([1, 3, 2]);
  });

  it("leaves the list as it is at the edges or for an unknown id", () => {
    expect(moveItem(list, 1, -1)).toBe(list);
    expect(moveItem(list, 3, 1)).toBe(list);
    expect(moveItem(list, 9, 1)).toBe(list);
  });

  it("does not change the original list", () => {
    moveItem(list, 1, 1);
    expect(ids(list)).toEqual([1, 2, 3]);
  });
});
