import { useEffect, useRef } from "react";
import { paintStroke, type BrushMode, type Point } from "./brush";
import { compose } from "./pipeline";
import type { AlphaMask, Raster, Rgb } from "./raster";
import type { SamPoint } from "./sam";

export type Tool = "view" | BrushMode | "select";

type CutoutCanvasProps = {
  image: Raster;
  alpha: AlphaMask;
  background: Rgb | null;
  tool: Tool;
  /** Brush radius in screen pixels. */
  brushSize: number;
  points: SamPoint[];
  label: string;
  onStroke: (alpha: AlphaMask) => void;
  onTap: (point: Point, include: boolean) => void;
};

function draw(canvas: HTMLCanvasElement, image: Raster, alpha: AlphaMask, background: Rgb | null, points: SamPoint[]) {
  const composed = compose(image, alpha, background);
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.putImageData(new ImageData(new Uint8ClampedArray(composed.data), image.width, image.height), 0, 0);
  const radius = Math.max(4, Math.round(Math.max(image.width, image.height) / 120));
  for (const point of points) {
    context.beginPath();
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fillStyle = point.include ? "#2f9e44" : "#c0272d";
    context.fill();
    context.lineWidth = Math.max(1, radius / 3);
    context.strokeStyle = "#ffffff";
    context.stroke();
  }
}

/** Preview of the cut-out that doubles as the drawing surface for the brush and taps. */
export function CutoutCanvas({ image, alpha, background, tool, brushSize, points, label, onStroke, onTap }: CutoutCanvasProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stroke = useRef<{ alpha: AlphaMask; last: Point; frame: number } | null>(null);

  useEffect(() => {
    if (canvas.current && !stroke.current) draw(canvas.current, image, alpha, background, points);
  }, [image, alpha, background, points]);

  const toImage = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = image.width / rect.width;
    return { point: { x: (event.clientX - rect.left) * scale, y: (event.clientY - rect.top) * scale }, scale };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "view") return;
    const { point, scale } = toImage(event);
    if (tool === "select") {
      // Right click or Alt-click excludes; the on-screen toggle handles touch.
      onTap(point, !(event.button === 2 || event.altKey));
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const radius = brushSize * scale;
    stroke.current = { alpha: paintStroke(alpha, image.width, image.height, point, point, radius, tool), last: point, frame: 0 };
    if (canvas.current) draw(canvas.current, image, stroke.current.alpha, background, points);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const current = stroke.current;
    if (!current || (tool !== "erase" && tool !== "restore")) return;
    const { point, scale } = toImage(event);
    current.alpha = paintStroke(current.alpha, image.width, image.height, current.last, point, brushSize * scale, tool);
    current.last = point;
    // Redraw at most once per frame: composing a 2048² image is not free.
    if (!current.frame) {
      current.frame = requestAnimationFrame(() => {
        current.frame = 0;
        if (canvas.current && stroke.current) draw(canvas.current, image, stroke.current.alpha, background, points);
      });
    }
  };

  const onPointerUp = () => {
    const current = stroke.current;
    if (!current) return;
    cancelAnimationFrame(current.frame);
    stroke.current = null;
    onStroke(current.alpha);
  };

  return (
    <canvas
      ref={canvas}
      role="img"
      aria-label={label}
      className={`cutout-canvas cutout-canvas--${tool}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(event) => tool === "select" && event.preventDefault()}
    />
  );
}
