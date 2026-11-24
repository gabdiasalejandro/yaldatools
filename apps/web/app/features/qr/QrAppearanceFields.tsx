import { useId, useRef } from "react";
import { useMessages, type Messages } from "~/i18n/messages";
import { PNG_SIZES, effectiveEcc, type DotShape, type EccLevel, type PngSize, type QrAppearance } from "./styling";

type ColorName = keyof Messages["qr"]["colors"];

const DOT_COLORS: [ColorName, string][] = [
  ["navy", "#000080"],
  ["black", "#0a0a0a"],
  ["sakura", "#a4307f"],
  ["teal", "#006060"],
];
const BACKGROUND_COLORS: [ColorName, string][] = [
  ["white", "#ffffff"],
  ["cream", "#ffffe1"],
  ["pink", "#f3d6e7"],
];
const SHAPES: readonly DotShape[] = ["square", "rounded", "dots"];
const ECC_LEVELS: readonly EccLevel[] = ["M", "H"];

type ColorPickerProps = {
  legend: string;
  presets: [ColorName, string][];
  value: string;
  onChange: (color: string) => void;
};

function ColorPicker({ legend, presets, value, onChange }: ColorPickerProps) {
  const t = useMessages();
  return (
    <div role="group" aria-label={legend} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span>{legend}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {presets.map(([name, hex]) => (
          <button
            key={hex}
            type="button"
            className="raised btn"
            aria-label={t.qr.colors[name]}
            aria-pressed={value === hex}
            onClick={() => onChange(hex)}
            style={{ width: 44, padding: 0, background: hex }}
          />
        ))}
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
          <input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            style={{ width: 44, height: 44, padding: 0, border: 0, background: "none" }}
          />
          {t.qr.customColor}
        </label>
      </div>
    </div>
  );
}

type QrAppearanceFieldsProps = {
  appearance: QrAppearance;
  onChange: (patch: Partial<QrAppearance>) => void;
  pngSize: PngSize;
  onPngSizeChange: (size: PngSize) => void;
};

export function QrAppearanceFields({ appearance, onChange, pngSize, onPngSizeChange }: QrAppearanceFieldsProps) {
  const t = useMessages();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  // The logo is read locally as a data URL; nothing is uploaded.
  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ logo: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <fieldset
      className="fieldset"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}
    >
      <legend>{t.qr.appearance}</legend>
      <ColorPicker legend={t.qr.dotsColor} presets={DOT_COLORS} value={appearance.dots} onChange={(dots) => onChange({ dots })} />
      <ColorPicker
        legend={t.qr.bgColor}
        presets={BACKGROUND_COLORS}
        value={appearance.background}
        onChange={(background) => onChange({ background })}
      />
      <div role="radiogroup" aria-label={t.qr.shape} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span>{t.qr.shape}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {SHAPES.map((shape) => (
            <label key={shape} style={{ display: "flex", gap: 4, alignItems: "center", minHeight: 44 }}>
              <input
                type="radio"
                name={`${id}-shape`}
                checked={appearance.shape === shape}
                onChange={() => onChange({ shape })}
              />
              {t.qr.shapes[shape]}
            </label>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span>{t.qr.logo}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="visually-hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              pickLogo(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <button type="button" className="raised btn" onClick={() => fileInput.current?.click()}>
            {t.qr.chooseLogo}
          </button>
          {appearance.logo && (
            <button type="button" className="raised btn" onClick={() => onChange({ logo: null })}>
              {t.qr.removeLogo}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor={`${id}-ecc`}>{t.qr.ecc}</label>
        <select
          id={`${id}-ecc`}
          className="sunken field"
          value={effectiveEcc(appearance)}
          disabled={appearance.logo !== null}
          aria-describedby={appearance.logo ? `${id}-ecc-note` : undefined}
          onChange={(event) => onChange({ ecc: event.target.value as EccLevel })}
        >
          {ECC_LEVELS.map((level) => (
            <option key={level} value={level}>
              {t.qr.eccLevels[level]}
            </option>
          ))}
        </select>
        {appearance.logo && (
          <small id={`${id}-ecc-note`}>{t.qr.eccWithLogo}</small>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label htmlFor={`${id}-size`}>{t.qr.pngSize}</label>
        <select
          id={`${id}-size`}
          className="sunken field"
          value={pngSize}
          onChange={(event) => onPngSizeChange(Number(event.target.value) as PngSize)}
        >
          {PNG_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} × {size} px
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
