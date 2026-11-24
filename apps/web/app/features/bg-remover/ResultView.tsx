import { useEffect, useId, useRef, useState } from "react";
import { useMessages } from "~/i18n/messages";
import { saveFile } from "~/shared/browser/download";
import { canvasToPng, drawRaster } from "./browserImage";
import { compose } from "./pipeline";
import type { Raster, Rgb } from "./raster";

type BackgroundChoice = "transparent" | "white" | "color";

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

type ResultViewProps = {
  image: Raster;
  alpha: Uint8ClampedArray;
  onAnother: () => void;
};

export function ResultView({ image, alpha, onAnother }: ResultViewProps) {
  const t = useMessages().removeBg;
  const id = useId();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [choice, setChoice] = useState<BackgroundChoice>("transparent");
  const [color, setColor] = useState("#f3d6e7");

  useEffect(() => {
    const background: Rgb | null =
      choice === "transparent" ? null : choice === "white" ? [255, 255, 255] : hexToRgb(color);
    if (canvas.current) drawRaster(canvas.current, compose(image, alpha, background));
  }, [image, alpha, choice, color]);

  const download = async () => {
    if (canvas.current) saveFile(await canvasToPng(canvas.current), "sin-fondo-yaldatools.png");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <div className={`sunken result-preview ${choice === "transparent" ? "checkerboard" : ""}`}>
        <canvas ref={canvas} role="img" aria-label={t.previewAlt} />
      </div>
      <fieldset className="fieldset" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <legend>{t.background}</legend>
        {(["transparent", "white", "color"] as const).map((option) => (
          <label key={option} style={{ display: "flex", gap: 4, alignItems: "center", minHeight: 44 }}>
            <input type="radio" name={`${id}-bg`} checked={choice === option} onChange={() => setChoice(option)} />
            {t.backgrounds[option]}
          </label>
        ))}
        <input
          type="color"
          aria-label={t.pickColor}
          value={color}
          onChange={(event) => {
            setColor(event.target.value);
            setChoice("color");
          }}
          style={{ width: 44, height: 44, padding: 0, border: 0, background: "none" }}
        />
      </fieldset>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" className="raised btn btn-primary" onClick={download}>
          {t.download}
        </button>
        <button type="button" className="raised btn" onClick={onAnother}>
          {t.another}
        </button>
      </div>
    </div>
  );
}
