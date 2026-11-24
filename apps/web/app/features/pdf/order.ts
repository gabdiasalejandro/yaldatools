// Reordering the list with the "Up" and "Down" buttons.

/** New list with the item moved one place up (-1) or down (+1); the same list when it cannot move. */
export function moveItem<T extends { id: number }>(items: readonly T[], id: number, direction: -1 | 1): readonly T[] {
  const from = items.findIndex((item) => item.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= items.length) return items;
  const moved = [...items];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
}
