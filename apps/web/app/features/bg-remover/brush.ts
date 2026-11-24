import type { AlphaMask } from "./raster";

export type BrushMode = "erase" | "restore";
export type Point = { x: number; y: number };

/** Share of the radius painted at full strength; the rest fades out. */
const HARD_CORE = 0.6;

function distanceToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/**
 * Paints one brush segment (from the previous pointer position to the current
 * one) on a copy of the mask. Erasing only lowers alpha and restoring only
 * raises it, so going over the same spot twice is harmless.
 */
export function paintStroke(
  alpha: AlphaMask,
  width: number,
  height: number,
  from: Point,
  to: Point,
  radius: number,
  mode: BrushMode,
): AlphaMask {
  const out = alpha.slice();
  const minX = Math.max(0, Math.floor(Math.min(from.x, to.x) - radius));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(from.x, to.x) + radius));
  const minY = Math.max(0, Math.floor(Math.min(from.y, to.y) - radius));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(from.y, to.y) + radius));
  const core = radius * HARD_CORE;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const distance = distanceToSegment(x, y, from, to);
      if (distance >= radius) continue;
      const strength = distance <= core ? 1 : (radius - distance) / (radius - core);
      const i = y * width + x;
      out[i] =
        mode === "erase"
          ? Math.min(out[i], Math.round(255 * (1 - strength)))
          : Math.max(out[i], Math.round(255 * strength));
    }
  }
  return out;
}
