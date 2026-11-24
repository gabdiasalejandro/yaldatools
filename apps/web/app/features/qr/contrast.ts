// Scan-risk check for the chosen colors, based on WCAG relative luminance.

/** Below this ratio, many phone cameras struggle to tell dots from background. */
export const MIN_SCAN_CONTRAST = 4;

function channels(hex: string): [number, number, number] {
  let value = hex.replace("#", "");
  if (value.length === 3) value = [...value].map((c) => c + c).join("");
  const n = Number.parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

/** True when the code may be hard to scan: low contrast or light dots on dark. */
export function hasScanRisk(dots: string, background: string): boolean {
  return relativeLuminance(dots) > relativeLuminance(background) || contrastRatio(dots, background) < MIN_SCAN_CONTRAST;
}
